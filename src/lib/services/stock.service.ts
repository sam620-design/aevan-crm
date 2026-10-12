import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ModuleName, ActionName, StockMovementType, TransferStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function getStockBalances(user: SessionUser, params: { locationId?: string; productId?: string } = {}) {
  const canView = await hasPermission(user, ModuleName.INVENTORY, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view inventory.");

  const where: any = {};
  if (params.locationId) where.locationId = params.locationId;
  if (params.productId) where.productId = params.productId;

  return prisma.stockBalance.findMany({
    where,
    include: {
      location: { select: { id: true, name: true, code: true, isActive: true } },
      product: { select: { id: true, name: true, sku: true, unit: true, minStockAlert: true } },
    },
    orderBy: [{ location: { name: "asc" } }, { product: { name: "asc" } }],
  });
}

/**
 * Transactional Stock Inward entry
 */
export async function recordStockInward(
  user: SessionUser,
  data: {
    productId: string;
    locationId: string;
    quantity: number;
    reason?: string | null;
    referenceId?: string | null;
  }
) {
  const canManage = await hasPermission(user, ModuleName.INVENTORY, ActionName.CREATE);
  if (!canManage) throw new Error("FORBIDDEN: You do not have permission to record inward stock.");

  if (data.quantity <= 0) {
    throw new Error("Inward quantity must be greater than zero.");
  }

  const location = await prisma.location.findUnique({ where: { id: data.locationId } });
  if (!location || !location.isActive) throw new Error("Selected storage location is inactive or not found.");

  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product || !product.isActive) throw new Error("Selected product is inactive or not found.");

  const inwardRef = data.referenceId || `INW-${Date.now()}`;

  // Execute atomically in transaction
  return prisma.$transaction(async (tx) => {
    // 1. Upsert stock balance
    const currentBalance = await tx.stockBalance.findUnique({
      where: {
        locationId_productId: {
          locationId: data.locationId,
          productId: data.productId,
        },
      },
    });

    const previousQty = currentBalance ? currentBalance.quantity : 0;
    const newQty = previousQty + data.quantity;

    const balance = await tx.stockBalance.upsert({
      where: {
        locationId_productId: {
          locationId: data.locationId,
          productId: data.productId,
        },
      },
      update: { quantity: newQty },
      create: {
        locationId: data.locationId,
        productId: data.productId,
        quantity: data.quantity,
      },
    });

    // 2. Create immutable stock movement record
    const movement = await tx.stockMovement.create({
      data: {
        movementType: StockMovementType.INWARD,
        productId: data.productId,
        locationId: data.locationId,
        quantity: data.quantity,
        balanceAfter: newQty,
        referenceType: "STOCK_INWARD",
        referenceId: inwardRef,
        performedById: user.id,
        reason: data.reason || "Manual inward stock receipt",
      },
    });

    return { balance, movement };
  });
}

/**
 * Concurrency-safe, Atomic Stock Transfer between locations
 */
export async function executeStockTransfer(
  user: SessionUser,
  data: {
    sourceLocationId: string;
    destinationLocationId: string;
    productId: string;
    quantity: number;
    transferNumber?: string;
    notes?: string | null;
  }
) {
  const canTransfer =
    (await hasPermission(user, ModuleName.INVENTORY, ActionName.TRANSFER_STOCK)) ||
    (await hasPermission(user, ModuleName.STOCK_TRANSFERS, ActionName.CREATE));

  if (!canTransfer) {
    throw new Error("FORBIDDEN: You do not have permission to execute stock transfers.");
  }

  // 1. Validation checks
  if (data.sourceLocationId === data.destinationLocationId) {
    throw new Error("Source and destination locations must be different.");
  }

  if (data.quantity <= 0) {
    throw new Error("Transfer quantity must be greater than zero.");
  }

  const transferNum = data.transferNumber || `TRF-${Date.now()}`;

  // 2. Atomic Database Transaction
  return prisma.$transaction(async (tx) => {
    // Check for idempotency: if transferNumber already exists, reject duplicate processing
    const existingTransfer = await tx.stockTransfer.findUnique({
      where: { transferNumber: transferNum },
    });
    if (existingTransfer) {
      throw new Error(`Duplicate transfer request: Transfer "${transferNum}" has already been processed.`);
    }

    // Verify locations
    const [sourceLoc, destLoc] = await Promise.all([
      tx.location.findUnique({ where: { id: data.sourceLocationId } }),
      tx.location.findUnique({ where: { id: data.destinationLocationId } }),
    ]);

    if (!sourceLoc || !sourceLoc.isActive) throw new Error("Source location is not active or does not exist.");
    if (!destLoc || !destLoc.isActive) throw new Error("Destination location is not active or does not exist.");

    // Verify source stock balance
    const sourceBalance = await tx.stockBalance.findUnique({
      where: {
        locationId_productId: {
          locationId: data.sourceLocationId,
          productId: data.productId,
        },
      },
    });

    const sourceAvailable = sourceBalance ? sourceBalance.quantity : 0;

    // CRITICAL: Negative-stock override remains strictly disabled
    if (sourceAvailable < data.quantity) {
      throw new Error(
        `Insufficient stock for transfer. Source location has ${sourceAvailable} units available, but ${data.quantity} units were requested.`
      );
    }

    const sourceNewBalance = sourceAvailable - data.quantity;

    // Deduct source stock balance
    await tx.stockBalance.update({
      where: {
        locationId_productId: {
          locationId: data.sourceLocationId,
          productId: data.productId,
        },
      },
      data: { quantity: sourceNewBalance },
    });

    // Credit destination stock balance
    const destBalance = await tx.stockBalance.findUnique({
      where: {
        locationId_productId: {
          locationId: data.destinationLocationId,
          productId: data.productId,
        },
      },
    });

    const destPrev = destBalance ? destBalance.quantity : 0;
    const destNewBalance = destPrev + data.quantity;

    await tx.stockBalance.upsert({
      where: {
        locationId_productId: {
          locationId: data.destinationLocationId,
          productId: data.productId,
        },
      },
      update: { quantity: destNewBalance },
      create: {
        locationId: data.destinationLocationId,
        productId: data.productId,
        quantity: data.quantity,
      },
    });

    // Create matching source stock movement ledger entry
    const outMovement = await tx.stockMovement.create({
      data: {
        movementType: StockMovementType.TRANSFER_OUT,
        productId: data.productId,
        locationId: data.sourceLocationId,
        quantity: -data.quantity,
        balanceAfter: sourceNewBalance,
        referenceType: "STOCK_TRANSFER",
        referenceId: transferNum,
        performedById: user.id,
        reason: `Transfer dispatched to ${destLoc.name}`,
      },
    });

    // Create matching destination stock movement ledger entry
    const inMovement = await tx.stockMovement.create({
      data: {
        movementType: StockMovementType.TRANSFER_IN,
        productId: data.productId,
        locationId: data.destinationLocationId,
        quantity: data.quantity,
        balanceAfter: destNewBalance,
        referenceType: "STOCK_TRANSFER",
        referenceId: transferNum,
        performedById: user.id,
        reason: `Transfer received from ${sourceLoc.name}`,
      },
    });

    // Create StockTransfer record
    const transferRecord = await tx.stockTransfer.create({
      data: {
        transferNumber: transferNum,
        sourceLocationId: data.sourceLocationId,
        destinationLocationId: data.destinationLocationId,
        productId: data.productId,
        quantity: data.quantity,
        status: TransferStatus.COMPLETED,
        senderId: user.id,
        notes: data.notes || null,
      },
      include: {
        product: { select: { name: true, sku: true } },
        sourceLocation: { select: { name: true, code: true } },
        destinationLocation: { select: { name: true, code: true } },
      },
    });

    return {
      transfer: transferRecord,
      outMovement,
      inMovement,
      sourceBalanceAfter: sourceNewBalance,
      destBalanceAfter: destNewBalance,
    };
  });
}
