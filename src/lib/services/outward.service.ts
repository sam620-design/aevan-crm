import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin } from "@/lib/permissions";
import {
  ModuleName,
  ActionName,
  DataScope,
  OutwardStatus,
  OutwardReconciliationStatus,
  StockMovementType,
  Prisma,
} from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

/**
 * 1. Fetch Outward entries with Record-level Data Scoping
 */
export async function getOutwards(
  user: SessionUser,
  params: {
    search?: string;
    status?: string;
    locationId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const canView = await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.VIEW);
  if (!canView) {
    throw new Error("FORBIDDEN: You do not have permission to view outward records.");
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.InventoryOutwardWhereInput = {};

  // Scope enforcement for non-superadmin
  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.INVENTORY_OUTWARD,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || DataScope.OWN;

    if (scope === DataScope.OWN) {
      where.OR = [
        { createdById: user.id },
        { responsibleStaffId: user.id },
      ];
    } else if (scope === DataScope.ASSIGNED) {
      where.OR = [
        { responsibleStaffId: user.id },
        { createdById: user.id },
      ];
    }
  }

  if (params.status && params.status !== "ALL") {
    where.status = params.status as OutwardStatus;
  }

  if (params.locationId && params.locationId !== "ALL") {
    where.sourceLocationId = params.locationId;
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.AND = [
      {
        OR: [
          { outwardNumber: { contains: term, mode: "insensitive" } },
          { purpose: { contains: term, mode: "insensitive" } },
          { takenBy: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, outwards] = await Promise.all([
    prisma.inventoryOutward.count({ where }),
    prisma.inventoryOutward.findMany({
      where,
      skip,
      take: limit,
      include: {
        sourceLocation: { select: { id: true, name: true, code: true } },
        responsibleStaff: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        reconciliations: true,
        approvals: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    data: outwards,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * 2. Fetch single Outward by ID with Data Scope verification
 */
export async function getOutwardById(user: SessionUser, id: string) {
  const canView = await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.VIEW);
  if (!canView) {
    throw new Error("FORBIDDEN: You do not have permission to view outward records.");
  }

  const outward = await prisma.inventoryOutward.findUnique({
    where: { id },
    include: {
      sourceLocation: true,
      responsibleStaff: { select: { id: true, name: true, email: true } },
      dispatchedBy: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true, email: true } },
      reopenedBy: { select: { id: true, name: true, email: true } },
      linkedSale: { select: { id: true, invoiceNumber: true, grandTotal: true } },
      linkedTransfer: { select: { id: true, transferNumber: true, status: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          reconciliations: true,
        },
      },
      reconciliations: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          linkedSale: { select: { id: true, invoiceNumber: true } },
          returnLocation: { select: { id: true, name: true, code: true } },
        },
      },
      approvals: {
        include: {
          approver: { select: { id: true, name: true, email: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!outward) throw new Error("Outward entry not found");

  // Record-level scope check
  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.INVENTORY_OUTWARD,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || DataScope.OWN;
    const isOwner = outward.createdById === user.id || outward.responsibleStaffId === user.id;

    if (scope === DataScope.OWN && !isOwner) {
      throw new Error("FORBIDDEN: You can only view your own outward records.");
    }
    if (scope === DataScope.ASSIGNED && !isOwner) {
      throw new Error("FORBIDDEN: You can only view outward records assigned to you.");
    }
  }

  return outward;
}

/**
 * 3. Create Draft Outward Entry (DOES NOT DEDUCT STOCK)
 */
export async function createOutwardDraft(
  user: SessionUser,
  data: {
    outwardNumber?: string;
    sourceLocationId: string;
    destinationLocationId?: string | null;
    purpose: string;
    takenBy: string;
    destination?: string | null;
    notes?: string | null;
    lines: Array<{ productId: string; quantity: number; unit?: string }>;
  }
) {
  const canCreate =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CREATE)) ||
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CREATE_OUTWARD));

  if (!canCreate) {
    throw new Error("FORBIDDEN: You do not have permission to create outward records.");
  }

  if (!data.lines || data.lines.length === 0) {
    throw new Error("At least one product line is required.");
  }

  // Verify source location
  const sourceLoc = await prisma.location.findUnique({
    where: { id: data.sourceLocationId },
  });
  if (!sourceLoc || !sourceLoc.isActive) {
    throw new Error("Source location not found or is currently inactive.");
  }

  // Generate safe sequential outward number
  const count = await prisma.inventoryOutward.count();
  const outwardNumber = data.outwardNumber || `OUT-${1001 + count}`;

  // Calculate dispatched total
  const totalDispatched = data.lines.reduce((sum, l) => sum + l.quantity, 0);

  // Create atomically with lines. Stock is NOT deducted in DRAFT status.
  const outward = await prisma.$transaction(async (tx) => {
    return tx.inventoryOutward.create({
      data: {
        outwardNumber,
        status: OutwardStatus.DRAFT,
        sourceLocationId: data.sourceLocationId,
        destinationLocationId: data.destinationLocationId || null,
        purpose: data.purpose.trim(),
        takenBy: data.takenBy.trim(),
        destination: data.destination || null,
        notes: data.notes || null,
        createdById: user.id,
        responsibleStaffId: user.id,
        totalDispatchedQty: totalDispatched,
        totalReconciledQty: 0,
        totalDiscrepancyQty: totalDispatched,
        lines: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unit: l.unit || "pcs",
            reconciledQty: 0,
            discrepancyQty: l.quantity,
          })),
        },
      },
      include: {
        lines: {
          include: { product: true },
        },
        sourceLocation: true,
      },
    });
  });

  await logAuditEvent({
    userId: user.id,
    action: "CREATE_OUTWARD_DRAFT",
    entityType: "INVENTORY_OUTWARD",
    entityId: outward.id,
    newState: outward,
  });

  return outward;
}

/**
 * 4. Update Draft Outward Entry
 */
export async function updateOutwardDraft(
  user: SessionUser,
  id: string,
  data: {
    sourceLocationId?: string;
    destinationLocationId?: string | null;
    purpose?: string;
    takenBy?: string;
    destination?: string | null;
    notes?: string | null;
    lines?: Array<{ productId: string; quantity: number; unit?: string }>;
  }
) {
  const canEdit = await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.EDIT);
  if (!canEdit) {
    throw new Error("FORBIDDEN: You do not have permission to edit outward records.");
  }

  const existing = await prisma.inventoryOutward.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!existing) throw new Error("Outward record not found");

  if (existing.status !== OutwardStatus.DRAFT) {
    throw new Error(
      `Cannot directly edit an entry with status "${existing.status}". Dispatched entries require authorized corrections.`
    );
  }

  // Scope check
  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.INVENTORY_OUTWARD,
          action: ActionName.EDIT,
        },
      },
    });
    const scope = userPerm?.scope || DataScope.OWN;
    const isOwner = existing.createdById === user.id || existing.responsibleStaffId === user.id;
    if (scope === DataScope.OWN && !isOwner) {
      throw new Error("FORBIDDEN: You can only edit your own outward records.");
    }
  }

  return prisma.$transaction(async (tx) => {
    let totalDispatched = existing.totalDispatchedQty;

    if (data.lines && data.lines.length > 0) {
      await tx.inventoryOutwardLine.deleteMany({ where: { outwardId: id } });
      totalDispatched = data.lines.reduce((sum, l) => sum + l.quantity, 0);

      await tx.inventoryOutwardLine.createMany({
        data: data.lines.map((l) => ({
          outwardId: id,
          productId: l.productId,
          quantity: l.quantity,
          unit: l.unit || "pcs",
          reconciledQty: 0,
          discrepancyQty: l.quantity,
        })),
      });
    }

    const updated = await tx.inventoryOutward.update({
      where: { id },
      data: {
        ...(data.sourceLocationId && { sourceLocationId: data.sourceLocationId }),
        ...(data.destinationLocationId !== undefined && { destinationLocationId: data.destinationLocationId }),
        ...(data.purpose && { purpose: data.purpose.trim() }),
        ...(data.takenBy && { takenBy: data.takenBy.trim() }),
        ...(data.destination !== undefined && { destination: data.destination }),
        ...(data.notes !== undefined && { notes: data.notes }),
        totalDispatchedQty: totalDispatched,
        totalDiscrepancyQty: totalDispatched,
      },
      include: {
        lines: { include: { product: true } },
        sourceLocation: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_OUTWARD_DRAFT",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return updated;
  });
}

/**
 * 5. Atomic Physical Stock Dispatch (DEDUCTS STOCK EXACTLY ONCE)
 */
export async function dispatchOutward(user: SessionUser, id: string) {
  const canDispatch =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CREATE)) ||
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CREATE_OUTWARD)) ||
    (await hasPermission(user, ModuleName.INVENTORY, ActionName.MANAGE_INVENTORY));

  if (!canDispatch) {
    throw new Error("FORBIDDEN: You do not have permission to physically dispatch outward inventory.");
  }

  return prisma.$transaction(async (tx) => {
    const outward = await tx.inventoryOutward.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true } },
        sourceLocation: true,
      },
    });

    if (!outward) throw new Error("Outward record not found");

    // Idempotency: prevent duplicate dispatch
    if (outward.status !== OutwardStatus.DRAFT && outward.status !== OutwardStatus.REOPENED) {
      throw new Error(
        `Duplicate dispatch rejected: Outward entry "${outward.outwardNumber}" is already in "${outward.status}" state.`
      );
    }

    if (!outward.sourceLocation.isActive) {
      throw new Error(`Source location "${outward.sourceLocation.name}" is currently inactive.`);
    }

    if (outward.lines.length === 0) {
      throw new Error("Cannot dispatch an outward entry with zero product lines.");
    }

    // Check stock balances and atomically deduct stock with immutable movement records
    for (const line of outward.lines) {
      const balance = await tx.stockBalance.findUnique({
        where: {
          locationId_productId: {
            locationId: outward.sourceLocationId,
            productId: line.productId,
          },
        },
      });

      const currentAvailable = balance ? balance.quantity : 0;

      // STRICT RULE: Negative stock is prohibited
      if (currentAvailable < line.quantity) {
        throw new Error(
          `Insufficient stock for "${line.product.name}". Available: ${currentAvailable} ${line.unit}, requested for dispatch: ${line.quantity} ${line.unit}.`
        );
      }

      const newBalance = currentAvailable - line.quantity;

      // Update source stock balance
      await tx.stockBalance.update({
        where: {
          locationId_productId: {
            locationId: outward.sourceLocationId,
            productId: line.productId,
          },
        },
        data: { quantity: newBalance },
      });

      // Write immutable physical stock movement
      await tx.stockMovement.create({
        data: {
          movementType: StockMovementType.OUTWARD,
          productId: line.productId,
          locationId: outward.sourceLocationId,
          quantity: -line.quantity,
          balanceAfter: newBalance,
          referenceType: "INVENTORY_OUTWARD",
          referenceId: outward.outwardNumber,
          performedById: user.id,
          reason: `Physical dispatch: ${outward.purpose} (Taken by ${outward.takenBy})`,
        },
      });
    }

    const updated = await tx.inventoryOutward.update({
      where: { id },
      data: {
        status: OutwardStatus.DISPATCHED,
        dispatchedAt: new Date(),
        dispatchedById: user.id,
      },
      include: {
        lines: { include: { product: true } },
        sourceLocation: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "DISPATCH_OUTWARD",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      newState: updated,
    });

    return updated;
  });
}

/**
 * 6. Mandatory Quantity Reconciliation
 */
export async function reconcileOutward(
  user: SessionUser,
  id: string,
  data: {
    items: Array<{
      lineId?: string | null;
      productId: string;
      disposition: any;
      quantity: number;
      linkedSaleId?: string | null;
      linkedTransferId?: string | null;
      returnLocationId?: string | null;
      notes?: string | null;
    }>;
  }
) {
  const canReconcile =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.EDIT)) ||
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CREATE));

  if (!canReconcile) {
    throw new Error("FORBIDDEN: You do not have permission to reconcile outward records.");
  }

  return prisma.$transaction(async (tx) => {
    const outward = await tx.inventoryOutward.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!outward) throw new Error("Outward record not found");

    if (outward.status === OutwardStatus.DRAFT) {
      throw new Error("Draft entries cannot be reconciled. Physical dispatch must be completed first.");
    }

    if (outward.status === OutwardStatus.CLOSED) {
      throw new Error("Closed entries cannot be modified without being reopened by an authorized user.");
    }

    // Group submission quantities by productId
    const groupedByProduct: Record<string, number> = {};
    for (const item of data.items) {
      if (item.quantity < 0) {
        throw new Error("Disposition quantity cannot be negative.");
      }
      if (item.disposition === "OTHER" && (!item.notes || item.notes.trim().length < 3)) {
        throw new Error("Written explanation is required when disposition is OTHER.");
      }
      groupedByProduct[item.productId] = (groupedByProduct[item.productId] || 0) + item.quantity;
    }

    // Verify per-line reconciliation rules
    let totalReconciled = 0;
    for (const line of outward.lines) {
      const lineReconciled = groupedByProduct[line.productId] || 0;
      if (lineReconciled > line.quantity) {
        throw new Error(
          `Reconciled quantity (${lineReconciled}) cannot exceed dispatched quantity (${line.quantity}) for line item ${line.productId}.`
        );
      }
      const lineDiscrepancy = line.quantity - lineReconciled;
      totalReconciled += lineReconciled;

      await tx.inventoryOutwardLine.update({
        where: { id: line.id },
        data: {
          reconciledQty: lineReconciled,
          discrepancyQty: lineDiscrepancy,
        },
      });
    }

    const totalDiscrepancy = outward.totalDispatchedQty - totalReconciled;

    // Remove un-processed previous reconciliations and save new records
    await tx.outwardReconciliation.deleteMany({
      where: { outwardId: id, isReturnProcessed: false },
    });

    await tx.outwardReconciliation.createMany({
      data: data.items.map((item) => ({
        outwardId: id,
        lineId: item.lineId || null,
        productId: item.productId,
        disposition: item.disposition,
        quantity: item.quantity,
        linkedSaleId: item.linkedSaleId || null,
        linkedTransferId: item.linkedTransferId || null,
        returnLocationId: item.returnLocationId || null,
        notes: item.notes || null,
        createdById: user.id,
      })),
    });

    const hasDiscrepancy = totalDiscrepancy > 0;
    const newStatus = hasDiscrepancy ? OutwardStatus.DISCREPANCY_PENDING : OutwardStatus.RECONCILED;

    const updated = await tx.inventoryOutward.update({
      where: { id },
      data: {
        status: newStatus,
        hasDiscrepancy,
        totalReconciledQty: totalReconciled,
        totalDiscrepancyQty: totalDiscrepancy,
        reconciliationStatus: hasDiscrepancy
          ? OutwardReconciliationStatus.DISCREPANCY
          : OutwardReconciliationStatus.RECONCILED,
      },
      include: {
        lines: { include: { product: true } },
        reconciliations: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "RECONCILE_OUTWARD",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      newState: updated,
    });

    return updated;
  });
}

/**
 * 7. Discrepancy Approval with Strict Self-Approval Rejection
 */
export async function approveOutwardDiscrepancy(
  user: SessionUser,
  id: string,
  data: { reason: string; notes?: string | null }
) {
  const canApprove =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.APPROVE_DISCREPANCY)) ||
    (await hasPermission(user, ModuleName.INVENTORY, ActionName.APPROVE_DISCREPANCY)) ||
    isSuperadmin(user);

  if (!canApprove) {
    throw new Error("FORBIDDEN: You do not have permission to approve inventory outward discrepancies.");
  }

  if (!data.reason || data.reason.trim().length < 3) {
    throw new Error("A non-empty written reason is mandatory for discrepancy approval.");
  }

  return prisma.$transaction(async (tx) => {
    const outward = await tx.inventoryOutward.findUnique({
      where: { id },
    });

    if (!outward) throw new Error("Outward record not found");

    if (outward.totalDiscrepancyQty <= 0) {
      throw new Error("Cannot approve discrepancy: Total discrepancy quantity is 0 (fully reconciled).");
    }

    // MANDATORY TENET: Self-approval is rejected by default
    const isSelfApproval =
      outward.createdById === user.id ||
      outward.dispatchedById === user.id ||
      outward.responsibleStaffId === user.id;

    if (isSelfApproval && !isSuperadmin(user)) {
      throw new Error(
        "FORBIDDEN: Self-approval is rejected. Discrepancies must be approved by an independent authorized user."
      );
    }

    // Create approval audit record
    const approval = await tx.outwardApproval.create({
      data: {
        outwardId: id,
        requesterId: outward.dispatchedById || outward.responsibleStaffId || outward.createdById || user.id,
        approverId: user.id,
        requestedQty: outward.totalDiscrepancyQty,
        reason: data.reason.trim(),
        status: "APPROVED",
        beforeDiscrepancy: outward.totalDiscrepancyQty,
        afterDiscrepancy: outward.totalDiscrepancyQty,
        notes: data.notes || null,
      },
    });

    // Update outward status (APPROVAL DOES NOT MODIFY STOCK MOVEMENTS)
    const updated = await tx.inventoryOutward.update({
      where: { id },
      data: {
        status: OutwardStatus.DISCREPANCY_APPROVED,
        approvedById: user.id,
        approvedAt: new Date(),
        discrepancyReason: data.reason.trim(),
        approvalNotes: data.notes || null,
      },
      include: {
        approvals: true,
        lines: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "APPROVE_OUTWARD_DISCREPANCY",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      newState: { approval, outward: updated },
    });

    return updated;
  });
}

/**
 * 8. Physical Return-To-Stock Acceptance (Credits stock at most once)
 */
export async function processReturnToStock(
  user: SessionUser,
  id: string,
  data: {
    reconciliationId: string;
    locationId: string;
    quantity: number;
    notes?: string | null;
  }
) {
  const canManage =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CREATE)) ||
    (await hasPermission(user, ModuleName.INVENTORY, ActionName.MANAGE_INVENTORY));

  if (!canManage) {
    throw new Error("FORBIDDEN: You do not have permission to accept goods returned to stock.");
  }

  if (data.quantity <= 0) {
    throw new Error("Accepted return quantity must be strictly positive.");
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.outwardReconciliation.findUnique({
      where: { id: data.reconciliationId },
      include: { outward: true },
    });

    if (!item || item.outwardId !== id) {
      throw new Error("Reconciliation line item not found for this outward record.");
    }

    if (item.disposition !== "RETURNED_TO_STOCK") {
      throw new Error(`Cannot process return: Item disposition is "${item.disposition}", not RETURNED_TO_STOCK.`);
    }

    // Idempotency: prevent duplicate returns
    if (item.isReturnProcessed) {
      throw new Error("Return has already been processed and credited to stock.");
    }

    if (data.quantity > item.quantity) {
      throw new Error(
        `Cannot return ${data.quantity} units; disposition allocated was only ${item.quantity} units.`
      );
    }

    const location = await tx.location.findUnique({ where: { id: data.locationId } });
    if (!location || !location.isActive) {
      throw new Error("Selected return location is not found or inactive.");
    }

    // Credit stock balance
    const currentBalance = await tx.stockBalance.findUnique({
      where: {
        locationId_productId: {
          locationId: data.locationId,
          productId: item.productId,
        },
      },
    });

    const prevQty = currentBalance ? currentBalance.quantity : 0;
    const newQty = prevQty + data.quantity;

    await tx.stockBalance.upsert({
      where: {
        locationId_productId: {
          locationId: data.locationId,
          productId: item.productId,
        },
      },
      update: { quantity: newQty },
      create: {
        locationId: data.locationId,
        productId: item.productId,
        quantity: data.quantity,
      },
    });

    // Create auditable RETURN stock movement
    const movement = await tx.stockMovement.create({
      data: {
        movementType: StockMovementType.RETURN,
        productId: item.productId,
        locationId: data.locationId,
        quantity: data.quantity,
        balanceAfter: newQty,
        referenceType: "OUTWARD_RETURN",
        referenceId: item.outward.outwardNumber,
        performedById: user.id,
        reason: data.notes || `Goods returned to stock from Outward ${item.outward.outwardNumber}`,
      },
    });

    // Mark reconciliation item as processed
    const updatedItem = await tx.outwardReconciliation.update({
      where: { id: item.id },
      data: {
        isReturnProcessed: true,
        returnLocationId: data.locationId,
        returnMovementId: movement.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "PROCESS_OUTWARD_RETURN",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      newState: { updatedItem, movement },
    });

    return { updatedItem, movement };
  });
}

/**
 * 9. Close Outward Entry (BLOCKED IF DISCREPANCY UNAPPROVED)
 */
export async function closeOutward(user: SessionUser, id: string, data?: { notes?: string | null }) {
  const canClose =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.CLOSE)) ||
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.EDIT)) ||
    isSuperadmin(user);

  if (!canClose) {
    throw new Error("FORBIDDEN: You do not have permission to close outward records.");
  }

  return prisma.$transaction(async (tx) => {
    const outward = await tx.inventoryOutward.findUnique({ where: { id } });
    if (!outward) throw new Error("Outward record not found");

    if (outward.status === OutwardStatus.CLOSED) {
      throw new Error("Outward record is already closed.");
    }

    if (outward.status === OutwardStatus.DRAFT) {
      throw new Error("Draft entries cannot be closed. Complete dispatch and reconciliation first.");
    }

    // MANDATORY RULE: Closure blocked if quantities remain unaccounted for without approval
    if (outward.totalDiscrepancyQty > 0 && outward.status !== OutwardStatus.DISCREPANCY_APPROVED) {
      throw new Error(
        `Closure blocked: Entry has an unresolved discrepancy of ${outward.totalDiscrepancyQty} units that requires authorized sign-off.`
      );
    }

    const updated = await tx.inventoryOutward.update({
      where: { id },
      data: {
        status: OutwardStatus.CLOSED,
        closedAt: new Date(),
        closedById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CLOSE_OUTWARD",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      newState: updated,
    });

    return updated;
  });
}

/**
 * 10. Reopen Closed Outward Entry
 */
export async function reopenOutward(user: SessionUser, id: string, data: { reason: string }) {
  const canReopen =
    (await hasPermission(user, ModuleName.INVENTORY_OUTWARD, ActionName.REOPEN)) ||
    isSuperadmin(user);

  if (!canReopen) {
    throw new Error("FORBIDDEN: You do not have permission to reopen closed outward records.");
  }

  if (!data.reason || data.reason.trim().length < 3) {
    throw new Error("A non-empty written reason is mandatory for reopening a closed entry.");
  }

  return prisma.$transaction(async (tx) => {
    const outward = await tx.inventoryOutward.findUnique({ where: { id } });
    if (!outward) throw new Error("Outward record not found");

    if (outward.status !== OutwardStatus.CLOSED) {
      throw new Error(`Only CLOSED entries can be reopened. Current status is "${outward.status}".`);
    }

    const updated = await tx.inventoryOutward.update({
      where: { id },
      data: {
        status: OutwardStatus.REOPENED,
        reopenedAt: new Date(),
        reopenedById: user.id,
        reopenReason: data.reason.trim(),
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "REOPEN_OUTWARD",
      entityType: "INVENTORY_OUTWARD",
      entityId: id,
      previousState: outward,
      newState: updated,
    });

    return updated;
  });
}
