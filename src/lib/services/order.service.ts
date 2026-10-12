import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin } from "@/lib/permissions";
import { ModuleName, ActionName, DataScope, Prisma, OrderStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

/**
 * Helper to calculate line and order totals with consistent rounding
 */
export function calculateOrderTotals<T extends { quantity: number; unitPrice: number; discount: number; taxRate: number }>(
  items: T[],
  deliveryCharges = 0
): {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  calculatedItems: (T & { lineTotal: number })[];
} {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const calculatedItems = items.map((item) => {
    const lineSubtotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    const lineDiscount = Math.round(item.discount * 100) / 100;
    const taxable = Math.max(0, lineSubtotal - lineDiscount);
    const lineTax = Math.round(taxable * (item.taxRate / 100) * 100) / 100;
    const lineTotal = Math.round((taxable + lineTax) * 100) / 100;

    subtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += lineTax;

    return {
      ...item,
      lineTotal,
    };
  });

  const grandTotal = Math.round((subtotal - totalDiscount + totalTax + deliveryCharges) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(totalDiscount * 100) / 100,
    tax: Math.round(totalTax * 100) / 100,
    deliveryCharges: Math.round(deliveryCharges * 100) / 100,
    grandTotal,
    calculatedItems,
  };
}

/**
 * 1. Fetch Orders with Scope Enforcement (OWN, ASSIGNED, ALL)
 */
export async function getOrders(
  user: SessionUser,
  params: {
    search?: string;
    status?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const canView = await hasPermission(user, ModuleName.ORDERS, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view orders.");

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.ORDERS,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN) {
      where.createdById = user.id;
    } else if (scope === DataScope.ASSIGNED) {
      where.OR = [
        { assignedToId: user.id },
        { createdById: user.id },
      ];
    }
  }

  if (params.customerId) where.customerId = params.customerId;
  if (params.status && params.status !== "ALL") where.status = params.status as OrderStatus;

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.AND = [
      {
        OR: [
          { orderNumber: { contains: term, mode: "insensitive" } },
          { customerName: { contains: term, mode: "insensitive" } },
          { notes: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, phone: true, customerCode: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        resultingSale: { select: { id: true, saleNumber: true, invoiceNumber: true, isFinalized: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * 2. Get single Order by ID
 */
export async function getOrderById(user: SessionUser, id: string) {
  const canView = await hasPermission(user, ModuleName.ORDERS, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view orders.");

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
      resultingSale: {
        select: {
          id: true,
          saleNumber: true,
          invoiceNumber: true,
          isFinalized: true,
          grandTotal: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.ORDERS,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || DataScope.OWN;
    const isOwner = order.createdById === user.id || order.assignedToId === user.id;

    if (scope === DataScope.OWN && !isOwner) {
      throw new Error("FORBIDDEN: You can only view your own orders.");
    }
    if (scope === DataScope.ASSIGNED && !isOwner) {
      throw new Error("FORBIDDEN: You can only view orders assigned to you.");
    }
  }

  return order;
}

/**
 * 3. Create Order (NEVER CREATES SALE OR INVOICE, NEVER DEDUCTS STOCK)
 */
export async function createOrder(
  user: SessionUser,
  data: {
    customerId: string;
    expectedDeliveryDate?: string | null;
    deliveryAddress?: string | null;
    deliveryCharges?: number;
    notes?: string | null;
    items: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>;
  }
) {
  const canCreate = await hasPermission(user, ModuleName.ORDERS, ActionName.CREATE);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create orders.");

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer || !customer.isActive) throw new Error("Selected customer not found or is inactive.");

  // Check product existence
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new Error("One or more selected products are invalid or not found.");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals
  const totals = calculateOrderTotals(data.items, data.deliveryCharges || 0);

  // Generate sequential order number
  const count = await prisma.order.count();
  const orderNumber = `ORD-${1001 + count}`;

  const order = await prisma.$transaction(async (tx) => {
    return tx.order.create({
      data: {
        orderNumber,
        customerId: data.customerId,
        customerName: customer.name,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        deliveryAddress: data.deliveryAddress || customer.shippingAddress || customer.billingAddress,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        deliveryCharges: totals.deliveryCharges,
        grandTotal: totals.grandTotal,
        status: OrderStatus.PENDING,
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
    action: "CREATE_ORDER",
    entityType: "ORDER",
    entityId: order.id,
    newState: order,
  });

  return order;
}

/**
 * 4. Update Order (Only before conversion to Sale)
 */
export async function updateOrder(
  user: SessionUser,
  id: string,
  data: {
    expectedDeliveryDate?: string | null;
    deliveryAddress?: string | null;
    deliveryCharges?: number;
    notes?: string | null;
    items?: Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>;
  }
) {
  const canEdit = await hasPermission(user, ModuleName.ORDERS, ActionName.EDIT);
  if (!canEdit) throw new Error("FORBIDDEN: You do not have permission to edit orders.");

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { resultingSale: true, items: true },
  });

  if (!existing) throw new Error("Order not found");
  if (existing.resultingSale) {
    throw new Error("Cannot edit order: A Sale has already been generated from this Order.");
  }

  return prisma.$transaction(async (tx) => {
    let totals: any = null;
    if (data.items && data.items.length > 0) {
      totals = calculateOrderTotals(data.items, data.deliveryCharges ?? Number(existing.deliveryCharges));
      await tx.orderItem.deleteMany({ where: { orderId: id } });

      const products = await tx.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      await tx.orderItem.createMany({
        data: totals.calculatedItems.map((item: any) => {
          const prod = productMap.get(item.productId);
          return {
            orderId: id,
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

    const updated = await tx.order.update({
      where: { id },
      data: {
        ...(data.expectedDeliveryDate !== undefined && {
          expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        }),
        ...(data.deliveryAddress !== undefined && { deliveryAddress: data.deliveryAddress }),
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
      action: "UPDATE_ORDER",
      entityType: "ORDER",
      entityId: id,
      previousState: existing,
      newState: updated,
    });

    return updated;
  });
}
