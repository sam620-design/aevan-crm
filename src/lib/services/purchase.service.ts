import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin, checkEntityAccess } from "@/lib/permissions";
import {
  ModuleName,
  ActionName,
  DataScope,
  Prisma,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
  SupplierBillStatus,
  PurchaseReturnStatus,
  SupplierPaymentStatus,
  SupplierLedgerEntryType,
  ExpenseStatus,
  StockMovementType,
  PaymentMethod,
} from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
export { round2 } from "./payment.service";
import { round2 } from "./payment.service";

// =============================================================
// 1. SUPPLIER MANAGEMENT
// =============================================================

export async function getSuppliers(
  user: SessionUser,
  params: { search?: string; category?: string; isActive?: boolean; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.SUPPLIERS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view suppliers.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.SupplierWhereInput = {};
  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.category) where.category = params.category;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { supplierCode: { contains: term, mode: "insensitive" } },
      { phone: { contains: term } },
      { contactPerson: { contains: term, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.supplier.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getSupplierById(user: SessionUser, id: string) {
  const canView =
    (await hasPermission(user, ModuleName.SUPPLIERS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view suppliers.");

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: { take: 5, orderBy: { orderDate: "desc" } },
      supplierBills: { take: 5, orderBy: { billDate: "desc" } },
    },
  });
  if (!supplier) throw new Error("Supplier not found.");
  return supplier;
}

export async function createSupplier(
  user: SessionUser,
  data: {
    name: string;
    businessName?: string | null;
    contactPerson?: string | null;
    phone: string;
    email?: string | null;
    billingAddress?: string | null;
    gstin?: string | null;
    category?: string;
    paymentTerms?: string;
    notes?: string | null;
  }
) {
  const canCreate =
    (await hasPermission(user, ModuleName.SUPPLIERS, ActionName.CREATE)) || isSuperadmin(user);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create suppliers.");

  return prisma.$transaction(async (tx) => {
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextSupplierNumber: { increment: 1 } },
    });
    const supplierCode = `${updatedConfig.supplierPrefix || "SUP-"}${String(
      updatedConfig.nextSupplierNumber - 1
    ).padStart(4, "0")}`;

    const supplier = await tx.supplier.create({
      data: {
        supplierCode,
        name: data.name.trim(),
        businessName: data.businessName?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        billingAddress: data.billingAddress?.trim() || null,
        gstin: data.gstin?.trim() || null,
        category: data.category || "General",
        paymentTerms: data.paymentTerms || "Net 30",
        notes: data.notes || null,
        createdById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CREATE_SUPPLIER",
      entityType: "SUPPLIER",
      entityId: supplier.id,
      newState: supplier,
    });

    return supplier;
  });
}

export async function updateSupplier(
  user: SessionUser,
  id: string,
  data: Partial<{
    name: string;
    businessName: string | null;
    contactPerson: string | null;
    phone: string;
    email: string | null;
    billingAddress: string | null;
    gstin: string | null;
    category: string;
    paymentTerms: string;
    notes: string | null;
    isActive: boolean;
  }>
) {
  const canEdit =
    (await hasPermission(user, ModuleName.SUPPLIERS, ActionName.EDIT)) || isSuperadmin(user);
  if (!canEdit) throw new Error("FORBIDDEN: You do not have permission to update suppliers.");

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new Error("Supplier not found.");

  const updated = await prisma.supplier.update({
    where: { id },
    data,
  });

  await logAuditEvent({
    userId: user.id,
    action: "UPDATE_SUPPLIER",
    entityType: "SUPPLIER",
    entityId: id,
    previousState: existing,
    newState: updated,
  });

  return updated;
}

export async function deactivateSupplier(user: SessionUser, id: string) {
  const canDeactivate =
    (await hasPermission(user, ModuleName.SUPPLIERS, ActionName.DEACTIVATE)) ||
    (await hasPermission(user, ModuleName.SUPPLIERS, ActionName.DELETE)) ||
    isSuperadmin(user);
  if (!canDeactivate) throw new Error("FORBIDDEN: You do not have permission to deactivate suppliers.");

  const supplier = await prisma.supplier.update({
    where: { id },
    data: { isActive: false },
  });

  await logAuditEvent({
    userId: user.id,
    action: "DEACTIVATE_SUPPLIER",
    entityType: "SUPPLIER",
    entityId: id,
  });

  return supplier;
}

// =============================================================
// 2. PURCHASE ORDERS (NO PHYSICAL STOCK MOVEMENT)
// =============================================================

export async function getPurchaseOrders(
  user: SessionUser,
  params: { search?: string; status?: PurchaseOrderStatus; supplierId?: string; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view purchase orders.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseOrderWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { poNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { orderDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, supplierCode: true } },
        location: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getPurchaseOrderById(user: SessionUser, id: string) {
  const canView =
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view purchase orders.");

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      location: true,
      items: { include: { product: true } },
      goodsReceipts: true,
      createdBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true, role: true } },
    },
  });
  if (!po) throw new Error("Purchase order not found.");
  return po;
}

export async function createPurchaseOrder(
  user: SessionUser,
  data: {
    supplierId: string;
    locationId: string;
    orderDate?: string;
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    freightCharges?: number;
    items: Array<{
      productId: string;
      orderedQuantity: number;
      unitPrice: number;
      discount?: number;
      taxRate?: number;
    }>;
  }
) {
  const canCreate =
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.CREATE)) || isSuperadmin(user);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create purchase orders.");

  const [supplier, location] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: data.supplierId } }),
    prisma.location.findUnique({ where: { id: data.locationId } }),
  ]);
  if (!supplier || !supplier.isActive) throw new Error("Selected supplier is inactive or not found.");
  if (!location || !location.isActive) throw new Error("Selected delivery location is inactive or not found.");

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  const freight = round2(data.freightCharges || 0);

  const calculatedItems = data.items.map((item) => {
    const prod = productMap.get(item.productId);
    if (!prod) throw new Error(`Product not found: ${item.productId}`);

    const lineSubtotal = round2(item.orderedQuantity * item.unitPrice);
    const lineDiscount = round2(item.discount || 0);
    const taxable = Math.max(0, round2(lineSubtotal - lineDiscount));
    const taxRate = item.taxRate !== undefined ? item.taxRate : Number(prod.taxRate);
    const lineTax = round2(taxable * (taxRate / 100));
    const lineTotal = round2(taxable + lineTax);

    subtotal = round2(subtotal + lineSubtotal);
    totalDiscount = round2(totalDiscount + lineDiscount);
    totalTax = round2(totalTax + lineTax);

    return {
      productId: item.productId,
      productName: prod.name,
      sku: prod.sku,
      unit: prod.unit,
      orderedQuantity: item.orderedQuantity,
      unitPrice: item.unitPrice,
      discount: lineDiscount,
      taxRate,
      lineTotal,
    };
  });

  const grandTotal = round2(subtotal - totalDiscount + totalTax + freight);

  return prisma.$transaction(async (tx) => {
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextPoNumber: { increment: 1 } },
    });
    const poNumber = `${updatedConfig.poPrefix || "PO-"}${String(
      updatedConfig.nextPoNumber - 1
    ).padStart(4, "0")}`;

    const po = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        locationId: data.locationId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        status: PurchaseOrderStatus.DRAFT,
        subtotal,
        discount: totalDiscount,
        tax: totalTax,
        freightCharges: freight,
        grandTotal,
        notes: data.notes || null,
        createdById: user.id,
        items: {
          create: calculatedItems,
        },
      },
      include: { items: true, supplier: true, location: true },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CREATE_PURCHASE_ORDER",
      entityType: "PURCHASE_ORDER",
      entityId: po.id,
      newState: po,
    });

    return po;
  });
}

export async function submitPurchaseOrder(user: SessionUser, poId: string) {
  const canSubmit =
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.SUBMIT)) ||
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.EDIT)) ||
    isSuperadmin(user);
  if (!canSubmit) throw new Error("FORBIDDEN: You do not have permission to submit purchase orders.");

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== PurchaseOrderStatus.DRAFT) {
    throw new Error(`Cannot submit purchase order: Order is already in ${po.status} status.`);
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: PurchaseOrderStatus.SUBMITTED,
      submittedAt: new Date(),
      submittedById: user.id,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "SUBMIT_PURCHASE_ORDER",
    entityType: "PURCHASE_ORDER",
    entityId: poId,
  });

  return updated;
}

export async function approvePurchaseOrder(user: SessionUser, poId: string) {
  const canApprove =
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.APPROVE)) || isSuperadmin(user);
  if (!canApprove) throw new Error("FORBIDDEN: You do not have permission to approve purchase orders.");

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== PurchaseOrderStatus.SUBMITTED && po.status !== PurchaseOrderStatus.DRAFT) {
    throw new Error(`Cannot approve purchase order: Current status is ${po.status}.`);
  }

  // Separation of approval: creator/submitter cannot approve their own order unless superadmin
  if (!isSuperadmin(user) && (po.createdById === user.id || po.submittedById === user.id)) {
    throw new Error("FORBIDDEN: Self-approval violation. Purchase orders must be approved by an independent authorized user.");
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: PurchaseOrderStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: user.id,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "APPROVE_PURCHASE_ORDER",
    entityType: "PURCHASE_ORDER",
    entityId: poId,
  });

  return updated;
}

export async function cancelPurchaseOrder(user: SessionUser, poId: string, reason: string) {
  const canCancel =
    (await hasPermission(user, ModuleName.PURCHASE_ORDERS, ActionName.CANCEL)) || isSuperadmin(user);
  if (!canCancel) throw new Error("FORBIDDEN: You do not have permission to cancel purchase orders.");

  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) throw new Error("Purchase order not found.");
  if (po.status === PurchaseOrderStatus.RECEIVED || po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) {
    throw new Error("Cannot cancel purchase order: Goods have already been received against this order.");
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: PurchaseOrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: user.id,
      cancelReason: reason,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "CANCEL_PURCHASE_ORDER",
    entityType: "PURCHASE_ORDER",
    entityId: poId,
    newState: { reason },
  });

  return updated;
}

// =============================================================
// 3. GOODS RECEIPT (PHYSICAL ARRIVAL & INVENTORY INWARD)
// =============================================================

export async function getGoodsReceipts(
  user: SessionUser,
  params: { search?: string; supplierId?: string; locationId?: string; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.GOODS_RECEIPTS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view goods receipts.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.GoodsReceiptWhereInput = {};
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.locationId) where.destinationLocationId = params.locationId;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { receiptNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.goodsReceipt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { receivedDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        destinationLocation: { select: { id: true, name: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.goodsReceipt.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getGoodsReceiptById(user: SessionUser, id: string) {
  const canView =
    (await hasPermission(user, ModuleName.GOODS_RECEIPTS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view goods receipts.");

  const grn = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      supplier: true,
      destinationLocation: true,
      purchaseOrder: true,
      lines: { include: { product: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!grn) throw new Error("Goods receipt not found.");
  return grn;
}

/**
 * Atomic Goods Receipt Creation:
 * - Increases physical stock ONLY for accepted quantities
 * - Rejected quantities are logged for quality control but NOT added to saleable stock
 * - Updates PurchaseOrderItem received quantities
 */
export async function createGoodsReceipt(
  user: SessionUser,
  data: {
    supplierId: string;
    destinationLocationId: string;
    purchaseOrderId?: string | null;
    receivedDate?: string;
    notes?: string | null;
    lines: Array<{
      productId: string;
      receivedQty: number;
      acceptedQty: number;
      rejectedQty?: number;
      rejectionReason?: string | null;
    }>;
  }
) {
  const canPost =
    (await hasPermission(user, ModuleName.GOODS_RECEIPTS, ActionName.POST)) ||
    (await hasPermission(user, ModuleName.GOODS_RECEIPTS, ActionName.CREATE)) ||
    isSuperadmin(user);
  if (!canPost) throw new Error("FORBIDDEN: You do not have permission to post goods receipts.");

  const [supplier, location] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: data.supplierId } }),
    prisma.location.findUnique({ where: { id: data.destinationLocationId } }),
  ]);
  if (!supplier || !supplier.isActive) throw new Error("Supplier is inactive or not found.");
  if (!location || !location.isActive) throw new Error("Destination warehouse is inactive or not found.");

  const productIds = data.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return prisma.$transaction(async (tx) => {
    // 1. Generate unique sequential receipt number
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextGrnNumber: { increment: 1 } },
    });
    const receiptNumber = `${updatedConfig.grnPrefix || "GRN-"}${String(
      updatedConfig.nextGrnNumber - 1
    ).padStart(4, "0")}`;

    // 2. Create GoodsReceipt Header
    const grn = await tx.goodsReceipt.create({
      data: {
        receiptNumber,
        purchaseOrderId: data.purchaseOrderId || null,
        supplierId: data.supplierId,
        destinationLocationId: data.destinationLocationId,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        status: GoodsReceiptStatus.POSTED,
        notes: data.notes || null,
        createdById: user.id,
        postedAt: new Date(),
        postedById: user.id,
      },
    });

    // 3. Process each line and update physical stock
    for (const line of data.lines) {
      const prod = productMap.get(line.productId);
      if (!prod) throw new Error(`Product not found: ${line.productId}`);

      const accepted = line.acceptedQty;
      const rejected = line.rejectedQty || 0;

      if (accepted + rejected !== line.receivedQty) {
        throw new Error(
          `Quantity mismatch for ${prod.name}: Accepted (${accepted}) + Rejected (${rejected}) must equal Received (${line.receivedQty}).`
        );
      }

      await tx.goodsReceiptLine.create({
        data: {
          goodsReceiptId: grn.id,
          productId: line.productId,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          receivedQty: line.receivedQty,
          acceptedQty: accepted,
          rejectedQty: rejected,
          rejectionReason: line.rejectionReason || null,
        },
      });

      // Atomically credit inventory ONLY for accepted quantities
      if (accepted > 0) {
        const curBal = await tx.stockBalance.findUnique({
          where: {
            locationId_productId: {
              locationId: data.destinationLocationId,
              productId: line.productId,
            },
          },
        });
        const prevQty = curBal ? curBal.quantity : 0;
        const newQty = prevQty + accepted;

        await tx.stockBalance.upsert({
          where: {
            locationId_productId: {
              locationId: data.destinationLocationId,
              productId: line.productId,
            },
          },
          update: { quantity: newQty },
          create: {
            locationId: data.destinationLocationId,
            productId: line.productId,
            quantity: accepted,
          },
        });

        // Log immutable StockMovement
        await tx.stockMovement.create({
          data: {
            movementType: StockMovementType.INWARD,
            productId: line.productId,
            locationId: data.destinationLocationId,
            quantity: accepted,
            balanceAfter: newQty,
            referenceType: "GOODS_RECEIPT",
            referenceId: receiptNumber,
            performedById: user.id,
            reason: `Purchase receipt from ${supplier.name}${rejected > 0 ? ` (${rejected} rejected)` : ""}`,
          },
        });
      }

      // Update linked PO line item if linked
      if (data.purchaseOrderId) {
        const poItem = await tx.purchaseOrderItem.findFirst({
          where: { purchaseOrderId: data.purchaseOrderId, productId: line.productId },
        });
        if (poItem) {
          const updatedRecQty = poItem.receivedQuantity + accepted;
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQuantity: updatedRecQty },
          });
        }
      }
    }

    // Update PO status if applicable
    if (data.purchaseOrderId) {
      const allPoItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: data.purchaseOrderId },
      });
      const allFullyReceived = allPoItems.every((i) => i.receivedQuantity >= i.orderedQuantity);
      const someReceived = allPoItems.some((i) => i.receivedQuantity > 0);

      await tx.purchaseOrder.update({
        where: { id: data.purchaseOrderId },
        data: {
          status: allFullyReceived
            ? PurchaseOrderStatus.RECEIVED
            : someReceived
            ? PurchaseOrderStatus.PARTIALLY_RECEIVED
            : PurchaseOrderStatus.APPROVED,
        },
      });
    }

    await logAuditEvent({
      userId: user.id,
      action: "POST_GOODS_RECEIPT",
      entityType: "GOODS_RECEIPT",
      entityId: grn.id,
      newState: { receiptNumber, itemsCount: data.lines.length },
    });

    return grn;
  });
}

// =============================================================
// 4. SUPPLIER BILLS / INVOICES (PAYABLE LIABILITY POSTING)
// =============================================================

export async function getSupplierBills(
  user: SessionUser,
  params: { search?: string; supplierId?: string; status?: SupplierBillStatus; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.SUPPLIER_BILLS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view supplier bills.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.SupplierBillWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { billNumber: { contains: term, mode: "insensitive" } },
      { supplierInvoiceNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.supplierBill.findMany({
      where,
      skip,
      take: limit,
      orderBy: { billDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.supplierBill.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getSupplierBillById(user: SessionUser, id: string) {
  const canView =
    (await hasPermission(user, ModuleName.SUPPLIER_BILLS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view supplier bills.");

  const bill = await prisma.supplierBill.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchaseOrder: true,
      goodsReceipt: true,
      items: { include: { product: true } },
      allocations: { include: { supplierPayment: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!bill) throw new Error("Supplier bill not found.");
  return bill;
}

/**
 * Creates and posts a Supplier Bill:
 * - Enforces duplicate invoice number check for the supplier
 * - Creates payable liability on Supplier.payableBalance
 * - Creates SupplierLedger entry
 * - DOES NOT duplicate inventory movement
 */
export async function createSupplierBill(
  user: SessionUser,
  data: {
    supplierId: string;
    supplierInvoiceNumber: string;
    purchaseOrderId?: string | null;
    goodsReceiptId?: string | null;
    billDate?: string;
    dueDate?: string | null;
    freight?: number;
    notes?: string | null;
    items: Array<{
      productId?: string | null;
      productName?: string | null;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }
) {
  const canPost =
    (await hasPermission(user, ModuleName.SUPPLIER_BILLS, ActionName.POST)) ||
    (await hasPermission(user, ModuleName.SUPPLIER_BILLS, ActionName.CREATE)) ||
    isSuperadmin(user);
  if (!canPost) throw new Error("FORBIDDEN: You do not have permission to post supplier bills.");

  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier || !supplier.isActive) throw new Error("Supplier is inactive or not found.");

  // Duplicate invoice check
  const duplicate = await prisma.supplierBill.findUnique({
    where: {
      supplierId_supplierInvoiceNumber: {
        supplierId: data.supplierId,
        supplierInvoiceNumber: data.supplierInvoiceNumber.trim(),
      },
    },
  });
  if (duplicate) {
    throw new Error(
      `Duplicate invoice violation: Bill with invoice #${data.supplierInvoiceNumber} already exists for supplier ${supplier.name}.`
    );
  }

  let subtotal = 0;
  let totalTax = 0;
  const freight = round2(data.freight || 0);

  const calculatedItems = data.items.map((i) => {
    const lineSubtotal = round2(i.quantity * i.unitPrice);
    const taxRate = i.taxRate !== undefined ? i.taxRate : 18.0;
    const lineTax = round2(lineSubtotal * (taxRate / 100));
    const lineTotal = round2(lineSubtotal + lineTax);

    subtotal = round2(subtotal + lineSubtotal);
    totalTax = round2(totalTax + lineTax);

    return {
      productId: i.productId || null,
      productName: i.productName || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate,
      lineTotal,
    };
  });

  const grandTotal = round2(subtotal + totalTax + freight);

  return prisma.$transaction(async (tx) => {
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextBillNumber: { increment: 1 } },
    });
    const billNumber = `${updatedConfig.billPrefix || "BIL-"}${String(
      updatedConfig.nextBillNumber - 1
    ).padStart(4, "0")}`;

    const bill = await tx.supplierBill.create({
      data: {
        billNumber,
        supplierInvoiceNumber: data.supplierInvoiceNumber.trim(),
        supplierId: data.supplierId,
        purchaseOrderId: data.purchaseOrderId || null,
        goodsReceiptId: data.goodsReceiptId || null,
        billDate: data.billDate ? new Date(data.billDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        subtotal,
        tax: totalTax,
        freight,
        grandTotal,
        paidAmount: 0,
        balanceAmount: grandTotal,
        status: SupplierBillStatus.POSTED,
        notes: data.notes || null,
        createdById: user.id,
        items: {
          create: calculatedItems,
        },
      },
    });

    // Update Supplier payable balance (Liability increases)
    const prevPayable = Number(supplier.payableBalance);
    const newPayable = round2(prevPayable + grandTotal);
    await tx.supplier.update({
      where: { id: data.supplierId },
      data: { payableBalance: newPayable },
    });

    // Append to SupplierLedger (Credit increases what we owe)
    await tx.supplierLedger.create({
      data: {
        supplierId: data.supplierId,
        entryType: SupplierLedgerEntryType.PURCHASE_BILL,
        referenceId: bill.id,
        referenceNumber: billNumber,
        debit: 0,
        credit: grandTotal,
        balance: newPayable,
        description: `Purchase Bill #${data.supplierInvoiceNumber} (${billNumber})`,
        createdById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "POST_SUPPLIER_BILL",
      entityType: "SUPPLIER_BILL",
      entityId: bill.id,
      newState: { billNumber, grandTotal, supplierInvoiceNumber: data.supplierInvoiceNumber },
    });

    return bill;
  });
}

// =============================================================
// 5. PURCHASE RETURNS (PHYSICAL GOODS RETURN & DEDUCTION)
// =============================================================

export async function getPurchaseReturns(
  user: SessionUser,
  params: { search?: string; supplierId?: string; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.PURCHASE_RETURNS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view purchase returns.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseReturnWhereInput = {};
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { returnNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.purchaseReturn.findMany({
      where,
      skip,
      take: limit,
      orderBy: { returnDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        sourceLocation: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.purchaseReturn.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createPurchaseReturn(
  user: SessionUser,
  data: {
    supplierId: string;
    sourceLocationId: string;
    goodsReceiptId?: string | null;
    supplierBillId?: string | null;
    reason: string;
    supplierCreditNoteRef?: string | null;
    lines: Array<{
      productId: string;
      quantity: number;
      unitPrice?: number;
    }>;
  }
) {
  const canPost =
    (await hasPermission(user, ModuleName.PURCHASE_RETURNS, ActionName.POST)) ||
    (await hasPermission(user, ModuleName.PURCHASE_RETURNS, ActionName.CREATE)) ||
    isSuperadmin(user);
  if (!canPost) throw new Error("FORBIDDEN: You do not have permission to post purchase returns.");

  const [supplier, location] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: data.supplierId } }),
    prisma.location.findUnique({ where: { id: data.sourceLocationId } }),
  ]);
  if (!supplier || !supplier.isActive) throw new Error("Supplier is inactive or not found.");
  if (!location || !location.isActive) throw new Error("Source warehouse is inactive or not found.");

  const productIds = data.lines.map((l) => l.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalReturnAmount = 0;
  const returnLines = data.lines.map((l) => {
    const prod = productMap.get(l.productId);
    if (!prod) throw new Error(`Product not found: ${l.productId}`);
    const price = l.unitPrice !== undefined ? l.unitPrice : Number(prod.basePrice);
    const lineTotal = round2(l.quantity * price);
    totalReturnAmount = round2(totalReturnAmount + lineTotal);
    return {
      productId: l.productId,
      productName: prod.name,
      sku: prod.sku,
      quantity: l.quantity,
      unitPrice: price,
      lineTotal,
    };
  });

  return prisma.$transaction(async (tx) => {
    // 1. Check stock balances at source location - Negative stock prohibited!
    for (const line of returnLines) {
      const balance = await tx.stockBalance.findUnique({
        where: {
          locationId_productId: {
            locationId: data.sourceLocationId,
            productId: line.productId,
          },
        },
      });
      const available = balance ? balance.quantity : 0;
      if (available < line.quantity) {
        throw new Error(
          `Insufficient stock for return: Product ${line.productName} has ${available} units available, but ${line.quantity} units requested to return.`
        );
      }
    }

    // 2. Generate unique returnNumber
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextReturnNumber: { increment: 1 } },
    });
    const returnNumber = `${updatedConfig.returnPrefix || "PRT-"}${String(
      updatedConfig.nextReturnNumber - 1
    ).padStart(4, "0")}`;

    // 3. Deduct stock and log stock movement
    for (const line of returnLines) {
      const balance = await tx.stockBalance.findUnique({
        where: {
          locationId_productId: {
            locationId: data.sourceLocationId,
            productId: line.productId,
          },
        },
      });
      const newBal = (balance ? balance.quantity : 0) - line.quantity;
      await tx.stockBalance.update({
        where: {
          locationId_productId: {
            locationId: data.sourceLocationId,
            productId: line.productId,
          },
        },
        data: { quantity: newBal },
      });

      await tx.stockMovement.create({
        data: {
          movementType: StockMovementType.RETURN,
          productId: line.productId,
          locationId: data.sourceLocationId,
          quantity: -line.quantity,
          balanceAfter: newBal,
          referenceType: "PURCHASE_RETURN",
          referenceId: returnNumber,
          performedById: user.id,
          reason: `Goods returned to supplier ${supplier.name}: ${data.reason}`,
        },
      });
    }

    // 4. Create PurchaseReturn Record
    const prt = await tx.purchaseReturn.create({
      data: {
        returnNumber,
        supplierId: data.supplierId,
        sourceLocationId: data.sourceLocationId,
        goodsReceiptId: data.goodsReceiptId || null,
        supplierBillId: data.supplierBillId || null,
        returnDate: new Date(),
        reason: data.reason,
        status: PurchaseReturnStatus.POSTED,
        totalAmount: totalReturnAmount,
        supplierCreditNoteRef: data.supplierCreditNoteRef || null,
        createdById: user.id,
        lines: { create: returnLines },
      },
    });

    // 5. Update Supplier Payable Balance (reduces what we owe)
    const prevPayable = Number(supplier.payableBalance);
    const newPayable = round2(prevPayable - totalReturnAmount);
    await tx.supplier.update({
      where: { id: data.supplierId },
      data: { payableBalance: newPayable },
    });

    // 6. Record SupplierLedger Debit entry (reduces payable balance)
    await tx.supplierLedger.create({
      data: {
        supplierId: data.supplierId,
        entryType: SupplierLedgerEntryType.PURCHASE_RETURN,
        referenceId: prt.id,
        referenceNumber: returnNumber,
        debit: totalReturnAmount,
        credit: 0,
        balance: newPayable,
        description: `Purchase Return (${returnNumber}): ${data.reason}`,
        createdById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "POST_PURCHASE_RETURN",
      entityType: "PURCHASE_RETURN",
      entityId: prt.id,
      newState: { returnNumber, totalAmount: totalReturnAmount },
    });

    return prt;
  });
}

// =============================================================
// 6. SUPPLIER PAYMENTS & ALLOCATIONS
// =============================================================

export async function getSupplierPayments(
  user: SessionUser,
  params: { search?: string; supplierId?: string; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.SUPPLIER_PAYMENTS, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view supplier payments.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.SupplierPaymentWhereInput = {};
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { paymentNumber: { contains: term, mode: "insensitive" } },
      { referenceNumber: { contains: term, mode: "insensitive" } },
      { supplier: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.supplierPayment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        allocations: { include: { supplierBill: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.supplierPayment.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createSupplierPayment(
  user: SessionUser,
  data: {
    supplierId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentDate?: string;
    referenceNumber?: string | null;
    notes?: string | null;
    allocations?: Array<{ billId: string; amount: number }>;
  }
) {
  const canPost =
    (await hasPermission(user, ModuleName.SUPPLIER_PAYMENTS, ActionName.POST)) ||
    (await hasPermission(user, ModuleName.SUPPLIER_PAYMENTS, ActionName.CREATE)) ||
    isSuperadmin(user);
  if (!canPost) throw new Error("FORBIDDEN: You do not have permission to record supplier payments.");

  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier || !supplier.isActive) throw new Error("Supplier is inactive or not found.");

  const payAmount = round2(data.amount);
  if (payAmount <= 0) throw new Error("Payment amount must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    // 1. Validate allocations
    let totalAllocated = 0;
    const resolvedAllocations: Array<{ billId: string; amount: number; bill: any }> = [];

    if (data.allocations && data.allocations.length > 0) {
      const billIds = data.allocations.map((a) => a.billId);
      const bills = await tx.supplierBill.findMany({ where: { id: { in: billIds } } });
      const billMap = new Map(bills.map((b) => [b.id, b]));

      for (const a of data.allocations) {
        const bill = billMap.get(a.billId);
        if (!bill) throw new Error(`Supplier bill not found: ${a.billId}`);
        if (bill.supplierId !== data.supplierId) {
          throw new Error("Cross-supplier allocation violation: Bill does not belong to the payment's supplier.");
        }
        const allocAmt = round2(a.amount);
        const bal = round2(Number(bill.balanceAmount));
        if (allocAmt > bal) {
          throw new Error(
            `Allocated amount ₹${allocAmt} exceeds remaining balance ₹${bal} for bill ${bill.billNumber}.`
          );
        }
        totalAllocated = round2(totalAllocated + allocAmt);
        resolvedAllocations.push({ billId: bill.id, amount: allocAmt, bill });
      }

      if (totalAllocated > payAmount) {
        throw new Error(
          `Allocations sum (₹${totalAllocated}) exceeds total supplier payment amount (₹${payAmount}).`
        );
      }
    }

    const unallocated = round2(payAmount - totalAllocated);

    // 2. Generate unique sequential payment number
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextSupplierPaymentNumber: { increment: 1 } },
    });
    const paymentNumber = `${updatedConfig.supplierPaymentPrefix || "SPAY-"}${String(
      updatedConfig.nextSupplierPaymentNumber - 1
    ).padStart(4, "0")}`;

    // 3. Create SupplierPayment
    const payment = await tx.supplierPayment.create({
      data: {
        paymentNumber,
        supplierId: data.supplierId,
        amount: payAmount,
        unallocatedAmount: unallocated,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        referenceNumber: data.referenceNumber || null,
        status: SupplierPaymentStatus.POSTED,
        notes: data.notes || null,
        createdById: user.id,
      },
    });

    // 4. Record allocations and update bills
    for (const alloc of resolvedAllocations) {
      await tx.supplierPaymentAllocation.create({
        data: {
          supplierPaymentId: payment.id,
          supplierBillId: alloc.billId,
          supplierId: data.supplierId,
          allocatedAmount: alloc.amount,
          createdById: user.id,
        },
      });

      const updatedPaid = round2(Number(alloc.bill.paidAmount) + alloc.amount);
      const updatedBalance = round2(Number(alloc.bill.balanceAmount) - alloc.amount);
      const status =
        updatedBalance <= 0 ? SupplierBillStatus.PAID : SupplierBillStatus.PARTIALLY_PAID;

      await tx.supplierBill.update({
        where: { id: alloc.billId },
        data: { paidAmount: updatedPaid, balanceAmount: updatedBalance, status },
      });
    }

    // 5. Update Supplier payable balance (Liability reduces)
    const prevPayable = Number(supplier.payableBalance);
    const newPayable = round2(prevPayable - payAmount);
    await tx.supplier.update({
      where: { id: data.supplierId },
      data: { payableBalance: newPayable },
    });

    // 6. Record SupplierLedger Debit entry (reduces payable balance)
    await tx.supplierLedger.create({
      data: {
        supplierId: data.supplierId,
        entryType: SupplierLedgerEntryType.SUPPLIER_PAYMENT,
        referenceId: payment.id,
        referenceNumber: paymentNumber,
        debit: payAmount,
        credit: 0,
        balance: newPayable,
        description: `Payment to supplier via ${data.paymentMethod}${data.referenceNumber ? ` (${data.referenceNumber})` : ""}`,
        createdById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "POST_SUPPLIER_PAYMENT",
      entityType: "SUPPLIER_PAYMENT",
      entityId: payment.id,
      newState: { paymentNumber, amount: payAmount, allocated: totalAllocated, unallocated },
    });

    return payment;
  });
}

export async function reverseSupplierPayment(
  user: SessionUser,
  paymentId: string,
  reason: string
) {
  const canReverse =
    (await hasPermission(user, ModuleName.SUPPLIER_PAYMENTS, ActionName.REVERSE)) || isSuperadmin(user);
  if (!canReverse) throw new Error("FORBIDDEN: You do not have permission to reverse supplier payments.");

  const payment = await prisma.supplierPayment.findUnique({
    where: { id: paymentId },
    include: { allocations: { include: { supplierBill: true } }, supplier: true },
  });
  if (!payment) throw new Error("Supplier payment not found.");
  if (payment.status === SupplierPaymentStatus.REVERSED) {
    throw new Error("Supplier payment has already been reversed.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Revert bill allocations
    for (const alloc of payment.allocations) {
      if (alloc.isReversed) continue;
      const bill = alloc.supplierBill;
      const allocAmt = Number(alloc.allocatedAmount);

      const updatedPaid = Math.max(0, round2(Number(bill.paidAmount) - allocAmt));
      const updatedBalance = round2(Number(bill.balanceAmount) + allocAmt);
      const status =
        updatedPaid === 0 ? SupplierBillStatus.POSTED : SupplierBillStatus.PARTIALLY_PAID;

      await tx.supplierBill.update({
        where: { id: bill.id },
        data: { paidAmount: updatedPaid, balanceAmount: updatedBalance, status },
      });

      await tx.supplierPaymentAllocation.update({
        where: { id: alloc.id },
        data: { isReversed: true, reversedAt: new Date(), reversalReason: reason },
      });
    }

    // 2. Mark payment reversed
    const updatedPayment = await tx.supplierPayment.update({
      where: { id: paymentId },
      data: {
        status: SupplierPaymentStatus.REVERSED,
        reversedAt: new Date(),
        reversedById: user.id,
        reversalReason: reason,
      },
    });

    // 3. Revert Supplier payable balance (Liability restored)
    const prevPayable = Number(payment.supplier.payableBalance);
    const newPayable = round2(prevPayable + Number(payment.amount));
    await tx.supplier.update({
      where: { id: payment.supplierId },
      data: { payableBalance: newPayable },
    });

    // 4. Append compensating SupplierLedger Credit entry (increases balance)
    await tx.supplierLedger.create({
      data: {
        supplierId: payment.supplierId,
        entryType: SupplierLedgerEntryType.PAYMENT_REVERSAL,
        referenceId: payment.id,
        referenceNumber: payment.paymentNumber,
        debit: 0,
        credit: payment.amount,
        balance: newPayable,
        description: `REVERSAL of Supplier Payment ${payment.paymentNumber}: ${reason}`,
        createdById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "REVERSE_SUPPLIER_PAYMENT",
      entityType: "SUPPLIER_PAYMENT",
      entityId: payment.id,
      newState: { status: "REVERSED", reason },
    });

    return updatedPayment;
  });
}

// =============================================================
// 7. SUPPLIER LEDGER & ACCOUNTS PAYABLE
// =============================================================

export async function getSupplierLedger(
  user: SessionUser,
  supplierId: string,
  filters: { startDate?: string; endDate?: string } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.SUPPLIER_LEDGER, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view supplier ledger.");

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new Error("Supplier not found.");

  const where: Prisma.SupplierLedgerWhereInput = { supplierId };
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const entries = await prisma.supplierLedger.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  const totalCredits = round2(entries.reduce((sum, e) => sum + Number(e.credit), 0));
  const totalDebits = round2(entries.reduce((sum, e) => sum + Number(e.debit), 0));
  const closingBalance = entries.length > 0 ? Number(entries[entries.length - 1].balance) : 0;

  return {
    supplier: {
      id: supplier.id,
      supplierCode: supplier.supplierCode,
      name: supplier.name,
      phone: supplier.phone,
      payableBalance: Number(supplier.payableBalance),
    },
    summary: {
      totalCredits,
      totalDebits,
      closingBalance,
      currentPayableBalance: Number(supplier.payableBalance),
    },
    entries,
  };
}

export async function getAccountsPayableReport(
  user: SessionUser,
  params: { supplierId?: string; asOfDate?: string } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.ACCOUNTS_PAYABLE, ActionName.VIEW)) ||
    (await hasPermission(user, ModuleName.REPORTS, ActionName.VIEW_REPORTS)) ||
    isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view accounts payable.");

  const asOf = params.asOfDate ? new Date(params.asOfDate) : new Date();

  const where: Prisma.SupplierBillWhereInput = {
    status: { in: [SupplierBillStatus.POSTED, SupplierBillStatus.PARTIALLY_PAID] },
    balanceAmount: { gt: 0 },
  };
  if (params.supplierId) where.supplierId = params.supplierId;

  const [openBills, suppliers] = await Promise.all([
    prisma.supplierBill.findMany({
      where,
      orderBy: { billDate: "asc" },
      include: { supplier: { select: { id: true, name: true, supplierCode: true } } },
    }),
    prisma.supplier.findMany({
      where: { payableBalance: { gt: 0 } },
      orderBy: { payableBalance: "desc" },
    }),
  ]);

  const agingBuckets = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
  };

  let totalPayables = 0;
  for (const bill of openBills) {
    const bal = round2(Number(bill.balanceAmount));
    totalPayables = round2(totalPayables + bal);

    const effectiveDueDate =
      bill.dueDate || new Date(new Date(bill.billDate).getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = asOf.getTime() - effectiveDueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) agingBuckets.current = round2(agingBuckets.current + bal);
    else if (daysOverdue <= 30) agingBuckets.days1_30 = round2(agingBuckets.days1_30 + bal);
    else if (daysOverdue <= 60) agingBuckets.days31_60 = round2(agingBuckets.days31_60 + bal);
    else if (daysOverdue <= 90) agingBuckets.days61_90 = round2(agingBuckets.days61_90 + bal);
    else agingBuckets.days90Plus = round2(agingBuckets.days90Plus + bal);
  }

  return {
    asOfDate: asOf.toISOString(),
    totals: {
      totalPayables,
      billCount: openBills.length,
      supplierCount: suppliers.length,
    },
    aging: agingBuckets,
    summary: {
      current: agingBuckets.current,
      days1To30: agingBuckets.days1_30,
      days31To60: agingBuckets.days31_60,
      days61To90: agingBuckets.days61_90,
      days90Plus: agingBuckets.days90Plus,
      totalPayable: totalPayables,
    },
    supplierRankings: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      supplierCode: s.supplierCode,
      payableBalance: Number(s.payableBalance),
    })),
    bills: openBills.map((b) => ({
      id: b.id,
      billNumber: b.billNumber,
      supplierInvoiceNumber: b.supplierInvoiceNumber,
      supplierId: b.supplierId,
      supplierCode: b.supplier.supplierCode,
      supplierName: b.supplier.name,
      billDate: b.billDate,
      dueDate: b.dueDate,
      grandTotal: Number(b.grandTotal),
      paidAmount: Number(b.paidAmount),
      balanceAmount: Number(b.balanceAmount),
      status: b.status,
    })),
  };
}

// =============================================================
// 8. BUSINESS EXPENSE MANAGEMENT & APPROVAL WORKFLOW
// =============================================================

export async function getExpenseCategories(user: SessionUser) {
  return prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getExpenses(
  user: SessionUser,
  params: { search?: string; categoryId?: string; status?: ExpenseStatus; page?: number; limit?: number } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.EXPENSES, ActionName.VIEW)) || isSuperadmin(user);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view expenses.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { expenseNumber: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
      { category: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { expenseDate: "desc" },
      include: {
        category: true,
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createExpense(
  user: SessionUser,
  data: {
    categoryId: string;
    title: string;
    description?: string | null;
    amount: number;
    tax?: number;
    expenseDate?: string;
    paymentMethod?: PaymentMethod;
    referenceNumber?: string | null;
    supplierId?: string | null;
    locationId?: string | null;
  }
) {
  const canCreate =
    (await hasPermission(user, ModuleName.EXPENSES, ActionName.CREATE)) || isSuperadmin(user);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create expenses.");

  const amt = round2(data.amount);
  const tax = round2(data.tax || 0);
  const totalAmount = round2(amt + tax);

  return prisma.$transaction(async (tx) => {
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) config = await tx.companyConfig.create({ data: { id: "default" } });

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextExpenseNumber: { increment: 1 } },
    });
    const expenseNumber = `${updatedConfig.expensePrefix || "EXP-"}${String(
      updatedConfig.nextExpenseNumber - 1
    ).padStart(4, "0")}`;

    const expense = await tx.expense.create({
      data: {
        expenseNumber,
        categoryId: data.categoryId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        amount: amt,
        tax,
        totalAmount,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        paymentMethod: data.paymentMethod || PaymentMethod.CASH,
        referenceNumber: data.referenceNumber || null,
        supplierId: data.supplierId || null,
        locationId: data.locationId || null,
        status: ExpenseStatus.POSTED,
        createdById: user.id,
      },
      include: { category: true },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CREATE_EXPENSE",
      entityType: "EXPENSE",
      entityId: expense.id,
      newState: expense,
    });

    return expense;
  });
}

export async function approveExpense(user: SessionUser, expenseId: string) {
  const canApprove =
    (await hasPermission(user, ModuleName.EXPENSES, ActionName.APPROVE)) || isSuperadmin(user);
  if (!canApprove) throw new Error("FORBIDDEN: You do not have permission to approve expenses.");

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new Error("Expense not found.");

  // Self-approval restriction
  if (!isSuperadmin(user) && expense.createdById === user.id) {
    throw new Error("FORBIDDEN: Self-approval violation. You cannot approve an expense you created.");
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: ExpenseStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: user.id,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "APPROVE_EXPENSE",
    entityType: "EXPENSE",
    entityId: expenseId,
  });

  return updated;
}

export async function rejectExpense(user: SessionUser, expenseId: string, reason: string) {
  const canReject =
    (await hasPermission(user, ModuleName.EXPENSES, ActionName.REJECT)) || isSuperadmin(user);
  if (!canReject) throw new Error("FORBIDDEN: You do not have permission to reject expenses.");

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) throw new Error("Expense not found.");

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: ExpenseStatus.REJECTED,
      rejectedAt: new Date(),
      rejectedById: user.id,
      rejectionReason: reason,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "REJECT_EXPENSE",
    entityType: "EXPENSE",
    entityId: expenseId,
    newState: { reason },
  });

  return updated;
}
