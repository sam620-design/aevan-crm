import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin } from "@/lib/permissions";
import { ModuleName, ActionName, DataScope, Prisma, SalePaymentStatus, LedgerEntryType } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { calculateOrderTotals } from "./order.service";

/**
 * 1. Fetch Sales with Data Scope Enforcement & Cost Masking
 */
export async function getSales(
  user: SessionUser,
  params: {
    search?: string;
    isFinalized?: boolean;
    customerId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const canView = await hasPermission(user, ModuleName.SALES, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view sales.");

  const canViewMargins = (await hasPermission(user, ModuleName.REPORTS, ActionName.VIEW_PROFIT_MARGINS)) || isSuperadmin(user);

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.SaleWhereInput = {};

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.SALES,
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
  if (params.isFinalized !== undefined) where.isFinalized = params.isFinalized;

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.AND = [
      {
        OR: [
          { saleNumber: { contains: term, mode: "insensitive" } },
          { invoiceNumber: { contains: term, mode: "insensitive" } },
          { customerName: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true, customerCode: true, gstin: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        finalizedBy: { select: { id: true, name: true, email: true } },
        linkedOrder: { select: { id: true, orderNumber: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Mask costPrice for unauthorized users
  const sanitizedSales = sales.map((s) => ({
    ...s,
    items: s.items.map((i) => ({
      ...i,
      costPrice: canViewMargins ? i.costPrice : null,
    })),
  }));

  return {
    data: sanitizedSales,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * 2. Get single Sale by ID
 */
export async function getSaleById(user: SessionUser, id: string) {
  const canView = await hasPermission(user, ModuleName.SALES, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view sales.");

  const canViewMargins = (await hasPermission(user, ModuleName.REPORTS, ActionName.VIEW_PROFIT_MARGINS)) || isSuperadmin(user);

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      finalizedBy: { select: { id: true, name: true, email: true } },
      linkedOrder: { select: { id: true, orderNumber: true, status: true } },
      linkedQuotation: { select: { id: true, quotationNumber: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  if (!sale) throw new Error("Sale record not found");

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.SALES,
          action: ActionName.VIEW,
        },
      },
    });
    const scope = userPerm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN && sale.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only view your own sales.");
    }
  }

  return {
    ...sale,
    items: sale.items.map((i) => ({
      ...i,
      costPrice: canViewMargins ? i.costPrice : null,
    })),
  };
}

/**
 * 3. Create Direct Sale (WITHOUT ORDER)
 */
export async function createDirectSale(
  user: SessionUser,
  data: {
    customerId: string;
    billingAddress?: string | null;
    shippingAddress?: string | null;
    deliveryCharges?: number;
    notes?: string | null;
    items: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>;
  }
) {
  const canCreate = await hasPermission(user, ModuleName.SALES, ActionName.CREATE);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create sales.");

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
    include: { priceList: { include: { productPrices: true } } },
  });
  if (!customer || !customer.isActive) throw new Error("Selected customer not found or is inactive.");

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new Error("One or more selected products are invalid or not found.");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Check manual price override & discount permissions
  const canChangePrice = (await hasPermission(user, ModuleName.SALES, ActionName.CHANGE_PRICE)) || isSuperadmin(user);
  const canApplyDiscount = (await hasPermission(user, ModuleName.SALES, ActionName.APPLY_DISCOUNT)) || isSuperadmin(user);

  for (const item of data.items) {
    const prod = productMap.get(item.productId);
    if (!prod) continue;

    // Check if price list has a price
    const plPrice = customer.priceList?.productPrices.find((pp) => pp.productId === item.productId)?.customPrice;
    const expectedPrice = plPrice ? Number(plPrice) : Number(prod.basePrice);

    if (Math.abs(item.unitPrice - expectedPrice) > 0.01 && !canChangePrice) {
      throw new Error(
        `FORBIDDEN: You do not have permission to override catalog prices (Product: ${prod.name}).`
      );
    }

    if (item.discount > 0 && !canApplyDiscount) {
      throw new Error("FORBIDDEN: You do not have permission to apply custom discounts.");
    }
  }

  // Calculate totals
  const totals = calculateOrderTotals(data.items, data.deliveryCharges || 0);

  // Generate unique saleNumber
  const count = await prisma.sale.count();
  const saleNumber = `SAL-${1001 + count}`;

  const sale = await prisma.$transaction(async (tx) => {
    return tx.sale.create({
      data: {
        saleNumber,
        invoiceNumber: null, // ONLY allocated on finalization
        customerId: data.customerId,
        customerName: customer.name,
        customerGstin: customer.gstin || null,
        billingAddress: data.billingAddress || customer.billingAddress || null,
        shippingAddress: data.shippingAddress || customer.shippingAddress || null,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        deliveryCharges: totals.deliveryCharges,
        grandTotal: totals.grandTotal,
        balanceAmount: totals.grandTotal,
        isFinalized: false,
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
              costPrice: prod?.costPrice || null,
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
    action: "CREATE_DIRECT_SALE",
    entityType: "SALE",
    entityId: sale.id,
    newState: sale,
  });

  return sale;
}

/**
 * 4. Atomic Order-to-Sale Conversion (CONCURRENCY-SAFE, DUPLICATE-PROTECTED)
 */
export async function createSaleFromOrder(user: SessionUser, orderId: string) {
  const canConvert =
    (await hasPermission(user, ModuleName.ORDERS, ActionName.CONVERT_ORDER_TO_SALE)) ||
    (await hasPermission(user, ModuleName.ORDERS, ActionName.CREATE_SALE)) ||
    (await hasPermission(user, ModuleName.SALES, ActionName.CREATE)) ||
    isSuperadmin(user);

  if (!canConvert) {
    throw new Error("FORBIDDEN: You do not have permission to convert orders to sales.");
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    if (!order) throw new Error("Order not found");

    // DUPLICATE CONVERSION CHECK: Database 1:1 constraint & transactional lock
    const existingSale = await tx.sale.findUnique({
      where: { orderId: order.id },
    });

    if (existingSale) {
      throw new Error(
        `CONFLICT: A Sale (${existingSale.saleNumber}) has already been generated from Order "${order.orderNumber}". Duplicate conversion is prohibited.`
      );
    }

    const count = await tx.sale.count();
    const saleNumber = `SAL-${1001 + count}`;

    // Create Sale record with preserved Order reference
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        invoiceNumber: null, // Allocated upon finalization
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerGstin: order.customer.gstin || null,
        billingAddress: order.customer.billingAddress || null,
        shippingAddress: order.deliveryAddress || order.customer.shippingAddress || null,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        deliveryCharges: order.deliveryCharges,
        grandTotal: order.grandTotal,
        balanceAmount: order.grandTotal,
        isFinalized: false,
        createdById: user.id,
        notes: `Converted from Order ${order.orderNumber}. ${order.notes || ""}`.trim(),
        items: {
          create: order.items.map((item) => ({
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
        linkedOrder: true,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CONVERT_ORDER_TO_SALE",
      entityType: "SALE",
      entityId: sale.id,
      newState: { orderId: order.id, saleId: sale.id, saleNumber },
    });

    return sale;
  });
}

/**
 * 5. Sequential Invoice Generation on Sale Finalization (TRANSACTION-SAFE, NO DUPLICATES)
 */
export async function finalizeSale(user: SessionUser, saleId: string, data?: { notes?: string | null }) {
  const canFinalize =
    (await hasPermission(user, ModuleName.SALES, ActionName.APPROVE)) ||
    (await hasPermission(user, ModuleName.SALES, ActionName.EDIT)) ||
    isSuperadmin(user);

  if (!canFinalize) {
    throw new Error("FORBIDDEN: You do not have permission to review and finalize sales.");
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { customer: true, items: true },
    });

    if (!sale) throw new Error("Sale record not found");

    if (sale.isFinalized) {
      throw new Error(
        `Sale "${sale.saleNumber}" is already finalized with Invoice Number "${sale.invoiceNumber}". Duplicate finalization rejected.`
      );
    }

    // Atomic increment of invoice counter in CompanyConfig
    let config = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await tx.companyConfig.create({
        data: {
          id: "default",
          companyName: "AEVAN Cleaning",
          invoicePrefix: "INV-",
          nextInvoiceNumber: 1001,
        },
      });
    }

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const allocatedNumber = updatedConfig.nextInvoiceNumber - 1;
    const invoicePrefix = updatedConfig.invoicePrefix || "INV-";
    const invoiceNumber = `${invoicePrefix}${String(allocatedNumber).padStart(4, "0")}`;

    // Verify invoice number uniqueness
    const existingInvoice = await tx.sale.findUnique({ where: { invoiceNumber } });
    if (existingInvoice) {
      throw new Error(`Concurrency conflict: Invoice number "${invoiceNumber}" was already assigned.`);
    }

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: {
        isFinalized: true,
        invoiceNumber,
        finalizedAt: new Date(),
        finalizedById: user.id,
        notes: data?.notes ? `${sale.notes || ""}\n${data.notes}`.trim() : sale.notes,
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        finalizedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Append to CustomerLedger (Debit represents invoice amount owed by customer)
    const lastLedger = await tx.customerLedger.findFirst({
      where: { customerId: sale.customerId },
      orderBy: { createdAt: "desc" },
    });
    const prevBalance = lastLedger ? Number(lastLedger.balance) : 0;
    const invoiceDebit = Number(sale.grandTotal);
    const newLedgerBalance = prevBalance + invoiceDebit;

    await tx.customerLedger.create({
      data: {
        customerId: sale.customerId,
        entryType: LedgerEntryType.SALE_INVOICE,
        referenceId: sale.id,
        referenceNumber: invoiceNumber,
        debit: invoiceDebit,
        credit: 0,
        balance: newLedgerBalance,
        description: `Tax Invoice ${invoiceNumber} for Sale ${sale.saleNumber}`,
        createdById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "FINALIZE_SALE_GENERATE_INVOICE",
      entityType: "SALE",
      entityId: saleId,
      newState: { saleNumber: sale.saleNumber, invoiceNumber, grandTotal: sale.grandTotal },
    });

    return updatedSale;
  });
}

/**
 * 6. Get Structured Invoice Document
 */
export async function getInvoiceDocument(user: SessionUser, saleId: string) {
  const sale = await getSaleById(user, saleId);
  if (!sale.isFinalized || !sale.invoiceNumber) {
    throw new Error("Cannot generate invoice: This Sale has not been finalized yet.");
  }

  const config = await prisma.companyConfig.findUnique({ where: { id: "default" } });

  return {
    company: {
      name: config?.companyName || "AEVAN Cleaning",
      brand: config?.brandName || "GOOD TOUCH",
      gstin: config?.gstin || "10ABCDE1234F1Z5",
      phone: config?.phone || "+91-7061101285",
      email: config?.email || "info@aevancleaning.com",
      address: config?.address || "Bihar Sharif, Nalanda, Bihar",
    },
    invoiceNumber: sale.invoiceNumber,
    saleNumber: sale.saleNumber,
    date: sale.finalizedAt || sale.createdAt,
    customer: {
      name: sale.customerName || sale.customer.name,
      phone: sale.customer.phone,
      gstin: sale.customerGstin || sale.customer.gstin,
      billingAddress: sale.billingAddress || sale.customer.billingAddress,
      shippingAddress: sale.shippingAddress || sale.customer.shippingAddress,
    },
    items: sale.items.map((item) => ({
      productName: item.productName || item.product.name,
      sku: item.sku || item.product.sku,
      unit: item.unit || item.product.unit,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      taxRate: Number(item.taxRate),
      lineTotal: Number(item.lineTotal),
    })),
    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    deliveryCharges: Number(sale.deliveryCharges),
    grandTotal: Number(sale.grandTotal),
    termsAndConditions: config?.termsAndConditions || "Payment due within 15 days of invoice date.",
  };
}
