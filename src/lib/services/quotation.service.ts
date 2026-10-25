import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin } from "@/lib/permissions";
import { ModuleName, ActionName, DataScope, Prisma, QuotationStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { calculateOrderTotals } from "./order.service";

/**
 * 1. Fetch Quotations with Scope Enforcement
 */
export async function getQuotations(
  user: SessionUser,
  params: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const canView = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view quotations.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.QuotationWhereInput = {};

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.QUOTATIONS,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN) {
      where.createdById = user.id;
    }
  }

  if (params.customerId) where.customerId = params.customerId;
  if (params.status && params.status !== "ALL") where.status = params.status as QuotationStatus;

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.AND = [
      {
        OR: [
          { quotationNumber: { contains: term, mode: "insensitive" } },
          { customerName: { contains: term, mode: "insensitive" } },
          { notes: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, quotations] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true, customerCode: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        resultingSale: { select: { id: true, saleNumber: true, invoiceNumber: true, isFinalized: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    data: quotations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * 2. Get Quotation by ID
 */
export async function getQuotationById(user: SessionUser, id: string) {
  const canView = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view quotations.");

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      resultingSale: { select: { id: true, saleNumber: true, invoiceNumber: true, isFinalized: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  if (!quotation) throw new Error("Quotation not found");

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.QUOTATIONS,
          action: ActionName.VIEW,
        },
      },
    });
    const scope = userPerm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN && quotation.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only view your own quotations.");
    }
  }

  return quotation;
}

/**
 * 3. Create Quotation (NEVER CREATES SALE OR INVOICE, NEVER TOUCHES STOCK)
 */
export async function createQuotation(
  user: SessionUser,
  data: {
    customerId: string;
    validUntil: string;
    deliveryCharges?: number;
    notes?: string | null;
    items: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>;
  }
) {
  const canCreate = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.CREATE);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create quotations.");

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer || !customer.isActive) throw new Error("Selected customer not found or is inactive.");

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new Error("One or more selected products are invalid or not found.");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const totals = calculateOrderTotals(data.items, data.deliveryCharges || 0);

  const count = await prisma.quotation.count();
  const quotationNumber = `QUO-${1001 + count}`;

  const quotation = await prisma.$transaction(async (tx) => {
    return tx.quotation.create({
      data: {
        quotationNumber,
        customerId: data.customerId,
        customerName: customer.name,
        validUntil: new Date(data.validUntil),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        deliveryCharges: totals.deliveryCharges,
        grandTotal: totals.grandTotal,
        status: QuotationStatus.DRAFT,
        createdById: user.id,
        notes: data.notes || null,
        items: {
          create: totals.calculatedItems.map((item) => {
            const prod = productMap.get(item.productId);
            return {
              productId: item.productId,
              productName: prod?.name || null,
              sku: prod?.sku || null,
              unit: prod?.unit || "pcs",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxRate: item.taxRate,
              lineTotal: item.lineTotal,
            };
          }),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  });

  await logAuditEvent({
    userId: user.id,
    action: "CREATE_QUOTATION",
    entityType: "QUOTATION",
    entityId: quotation.id,
    newState: quotation,
  });

  return quotation;
}

/**
 * 4. Issue / Send Quotation
 */
export async function issueQuotation(user: SessionUser, id: string) {
  const canEdit = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.EDIT);
  if (!canEdit) throw new Error("FORBIDDEN: You do not have permission to issue quotations.");

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: QuotationStatus.SENT,
      issuedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "ISSUE_QUOTATION",
    entityType: "QUOTATION",
    entityId: id,
    newState: updated,
  });

  return updated;
}

/**
 * 5. Accept Quotation
 */
export async function acceptQuotation(user: SessionUser, id: string) {
  const canApprove =
    (await hasPermission(user, ModuleName.QUOTATIONS, ActionName.APPROVE)) ||
    (await hasPermission(user, ModuleName.QUOTATIONS, ActionName.EDIT)) ||
    isSuperadmin(user);

  if (!canApprove) throw new Error("FORBIDDEN: You do not have permission to accept quotations.");

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: QuotationStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "ACCEPT_QUOTATION",
    entityType: "QUOTATION",
    entityId: id,
    newState: updated,
  });

  return updated;
}

/**
 * 6. Reject Quotation
 */
export async function rejectQuotation(user: SessionUser, id: string, data?: { reason?: string | null }) {
  const canEdit = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.EDIT);
  if (!canEdit) throw new Error("FORBIDDEN: You do not have permission to reject quotations.");

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: QuotationStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: data?.reason || null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "REJECT_QUOTATION",
    entityType: "QUOTATION",
    entityId: id,
    newState: updated,
  });

  return updated;
}

/**
 * 7. Reopen Rejected/Expired Quotation
 */
export async function reopenQuotation(user: SessionUser, id: string, data: { reason: string }) {
  const canReopen =
    (await hasPermission(user, ModuleName.QUOTATIONS, ActionName.REOPEN)) ||
    isSuperadmin(user);

  if (!canReopen) throw new Error("FORBIDDEN: You do not have permission to reopen quotations.");

  if (!data.reason || data.reason.trim().length < 3) {
    throw new Error("Mandatory non-empty reason is required to reopen a quotation.");
  }

  const updated = await prisma.quotation.update({
    where: { id },
    data: {
      status: QuotationStatus.DRAFT,
      reopenedAt: new Date(),
      reopenedById: user.id,
      reopenReason: data.reason.trim(),
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "REOPEN_QUOTATION",
    entityType: "QUOTATION",
    entityId: id,
    newState: updated,
  });

  return updated;
}

/**
 * 8. Convert Accepted Quotation to Sale (CONCURRENCY-SAFE, DUPLICATE-PROTECTED)
 */
export async function convertQuotationToSale(user: SessionUser, quotationId: string) {
  const canConvert =
    (await hasPermission(user, ModuleName.QUOTATIONS, ActionName.CONVERT_TO_SALE)) ||
    (await hasPermission(user, ModuleName.QUOTATIONS, ActionName.CREATE_SALE)) ||
    (await hasPermission(user, ModuleName.SALES, ActionName.CREATE)) ||
    isSuperadmin(user);

  if (!canConvert) {
    throw new Error("FORBIDDEN: You do not have permission to convert quotations to sales.");
  }

  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    if (!quotation) throw new Error("Quotation not found");

    // DUPLICATE CONVERSION PREVENTION
    if (quotation.status === QuotationStatus.CONVERTED || quotation.convertedSaleId) {
      throw new Error(
        `CONFLICT: Quotation "${quotation.quotationNumber}" has already been converted to a Sale. Duplicate conversion is prohibited.`
      );
    }

    const existingSale = await tx.sale.findUnique({
      where: { quotationId: quotation.id },
    });

    if (existingSale) {
      throw new Error(
        `CONFLICT: Sale "${existingSale.saleNumber}" already exists for Quotation "${quotation.quotationNumber}".`
      );
    }

    const count = await tx.sale.count();
    const saleNumber = `SAL-${1001 + count}`;

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        invoiceNumber: null, // ONLY generated on finalization
        quotationId: quotation.id,
        customerId: quotation.customerId,
        customerName: quotation.customer.name,
        customerGstin: quotation.customer.gstin || null,
        billingAddress: quotation.customer.billingAddress || null,
        shippingAddress: quotation.customer.shippingAddress || null,
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        tax: quotation.tax,
        deliveryCharges: quotation.deliveryCharges,
        grandTotal: quotation.grandTotal,
        balanceAmount: quotation.grandTotal,
        isFinalized: false,
        createdById: user.id,
        notes: `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes || ""}`.trim(),
        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            productName: item.productName || item.product.name,
            sku: item.sku || item.product.sku,
            unit: item.unit || item.product.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            lineTotal: item.lineTotal,
            costPrice: item.product.costPrice || null,
          })),
        },
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    // Mark quotation as converted
    await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.CONVERTED,
        convertedSaleId: sale.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CONVERT_QUOTATION_TO_SALE",
      entityType: "QUOTATION",
      entityId: quotation.id,
      newState: { quotationId: quotation.id, saleId: sale.id, saleNumber },
    });

    return sale;
  });
}

export async function updateQuotation(
  user: SessionUser,
  id: string,
  data: {
    validUntil?: string | null;
    notes?: string | null;
    deliveryCharges?: number;
    items?: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>;
  }
) {
  const canEdit = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.EDIT);
  if (!canEdit) throw new Error("FORBIDDEN: You do not have permission to edit quotations.");

  const existing = await prisma.quotation.findUnique({
    where: { id },
    include: { resultingSale: true, items: true },
  });

  if (!existing) throw new Error("Quotation not found");
  if (existing.status === QuotationStatus.CONVERTED || existing.resultingSale) {
    throw new Error("Cannot edit quotation: It has already been converted to a Sale.");
  }

  return prisma.$transaction(async (tx) => {
    let totals: any = null;
    if (data.items && data.items.length > 0) {
      totals = calculateOrderTotals(data.items, data.deliveryCharges ?? Number(existing.deliveryCharges));
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });

      const products = await tx.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      await tx.quotationItem.createMany({
        data: totals.calculatedItems.map((item: any) => {
          const prod = productMap.get(item.productId);
          return {
            quotationId: id,
            productId: item.productId,
            productName: prod?.name || null,
            sku: prod?.sku || null,
            unit: prod?.unit || "pcs",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            lineTotal: item.lineTotal,
          };
        }),
      });
    }

    const updated = await tx.quotation.update({
      where: { id },
      data: {
        ...(data.validUntil !== undefined && {
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(totals && {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          deliveryCharges: totals.deliveryCharges,
          grandTotal: totals.grandTotal,
        }),
      },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_QUOTATION",
      entityType: "QUOTATION",
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return updated;
  });
}

export async function deleteQuotation(user: SessionUser, id: string) {
  const canDelete = await hasPermission(user, ModuleName.QUOTATIONS, ActionName.DELETE);
  if (!canDelete) throw new Error("FORBIDDEN: You do not have permission to delete quotations.");

  const existing = await prisma.quotation.findUnique({
    where: { id },
    include: { resultingSale: true, items: true },
  });

  if (!existing) throw new Error("Quotation not found");
  if (existing.status === QuotationStatus.CONVERTED || existing.resultingSale) {
    throw new Error("Cannot delete quotation: It has already been converted to a Sale.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: id } });
    await tx.quotation.delete({ where: { id } });

    await logAuditEvent({
      userId: user.id,
      action: "DELETE_QUOTATION",
      entityType: "QUOTATION",
      entityId: id,
      previousState: existing,
      newState: null,
    });

    return { success: true, message: `Quotation ${existing.quotationNumber} deleted successfully.` };
  });
}

