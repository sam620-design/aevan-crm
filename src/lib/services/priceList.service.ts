import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { ModuleName, ActionName } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function getPriceLists(user: SessionUser) {
  const canView = await hasPermission(user, ModuleName.PRICE_LISTS, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view price lists.");

  return prisma.customerPriceList.findMany({
    include: {
      _count: { select: { customers: true, productPrices: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createPriceList(user: SessionUser, data: any) {
  const canCreate = await hasPermission(user, ModuleName.PRICE_LISTS, ActionName.CREATE);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create price lists.");

  const existing = await prisma.customerPriceList.findUnique({
    where: { name: data.name.trim() },
  });
  if (existing) throw new Error(`Price list with name "${data.name}" already exists.`);

  const priceList = await prisma.customerPriceList.create({
    data: {
      name: data.name.trim(),
      type: data.type || "RETAIL",
      description: data.description || null,
      discountPercentage: data.discountPercentage || 0,
      isDefault: data.isDefault || false,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "CREATE_PRICE_LIST",
    entityType: "PRICE_LIST",
    entityId: priceList.id,
    newState: priceList,
  });

  return priceList;
}

export async function setProductPrice(
  user: SessionUser,
  params: { priceListId: string; productId: string; customPrice: number }
) {
  const canChange =
    (await hasPermission(user, ModuleName.PRICE_LISTS, ActionName.EDIT)) ||
    (await hasPermission(user, ModuleName.SALES, ActionName.CHANGE_PRICE));

  if (!canChange) {
    throw new Error("FORBIDDEN: You do not have permission to configure product prices.");
  }

  if (params.customPrice < 0) {
    throw new Error("Custom price cannot be negative.");
  }

  const result = await prisma.productPrice.upsert({
    where: {
      priceListId_productId: {
        priceListId: params.priceListId,
        productId: params.productId,
      },
    },
    update: {
      customPrice: params.customPrice,
    },
    create: {
      priceListId: params.priceListId,
      productId: params.productId,
      customPrice: params.customPrice,
    },
    include: {
      product: { select: { name: true, sku: true } },
      priceList: { select: { name: true } },
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "SET_PRODUCT_PRICE",
    entityType: "PRODUCT_PRICE",
    entityId: result.id,
    newState: result,
  });

  return result;
}

export async function auditPriceOverride(
  user: SessionUser,
  data: {
    originalPrice: number;
    overriddenPrice: number;
    reason: string;
    customerId?: string;
    productId?: string;
  }
) {
  const canOverride = await hasPermission(user, ModuleName.SALES, ActionName.CHANGE_PRICE);
  if (!canOverride) {
    throw new Error("FORBIDDEN: You do not have authorization to override prices.");
  }

  if (data.overriddenPrice < 0) {
    throw new Error("Overridden price cannot be negative.");
  }

  return logAuditEvent({
    userId: user.id,
    action: "MANUAL_PRICE_OVERRIDE",
    entityType: "PRICE_OVERRIDE",
    entityId: data.productId || null,
    previousState: { originalPrice: data.originalPrice },
    newState: {
      overriddenPrice: data.overriddenPrice,
      reason: data.reason,
      customerId: data.customerId,
      timestamp: new Date().toISOString(),
    },
  });
}
