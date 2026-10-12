import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin } from "@/lib/permissions";
import { ModuleName, ActionName, Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function getProducts(
  user: SessionUser,
  params: {
    search?: string;
    category?: string;
    includeInactive?: boolean;
    page?: number;
    limit?: number;
  } = {}
) {
  const canView = await hasPermission(user, ModuleName.INVENTORY, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view products.");

  // Check if user is authorized to view profit/cost margins
  const canViewMargins =
    isSuperadmin(user) ||
    (await hasPermission(user, ModuleName.REPORTS, ActionName.VIEW_PROFIT_MARGINS));

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {};
  if (!params.includeInactive) {
    where.isActive = true;
  }

  if (params.category && params.category !== "ALL") {
    where.category = params.category;
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { barcode: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        stockBalances: {
          include: {
            location: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Strip costPrice if unauthorized
  const sanitized = products.map((p) => {
    const totalPhysicalStock = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
    return {
      ...p,
      totalPhysicalStock,
      costPrice: canViewMargins ? p.costPrice : null, // MASKED
    };
  });

  return {
    data: sanitized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    marginsVisible: canViewMargins,
  };
}

export async function createProduct(user: SessionUser, data: any) {
  const canCreate = await hasPermission(user, ModuleName.INVENTORY, ActionName.CREATE);
  if (!canCreate) throw new Error("FORBIDDEN: You do not have permission to create products.");

  // Validate unique SKU
  const existingSku = await prisma.product.findUnique({
    where: { sku: data.sku.trim().toUpperCase() },
  });
  if (existingSku) {
    throw new Error(`Product SKU "${data.sku}" already exists. SKU must be unique.`);
  }

  // Validate unique Barcode if provided
  if (data.barcode && data.barcode.trim()) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode.trim() },
    });
    if (existingBarcode) {
      throw new Error(`Barcode "${data.barcode}" already exists on another product.`);
    }
  }

  // Validate prices & tax
  if (data.basePrice < 0) throw new Error("Base price cannot be negative.");
  if (data.taxRate < 0 || data.taxRate > 100) throw new Error("Tax rate must be between 0 and 100%.");

  const product = await prisma.product.create({
    data: {
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      barcode: data.barcode ? data.barcode.trim() : null,
      description: data.description || null,
      category: data.category.trim(),
      unit: data.unit || "pcs",
      basePrice: data.basePrice,
      costPrice: data.costPrice !== undefined ? data.costPrice : null,
      taxRate: data.taxRate,
      minStockAlert: data.minStockAlert || 10,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "CREATE_PRODUCT",
    entityType: "PRODUCT",
    entityId: product.id,
    newState: product,
  });

  return product;
}

export async function updateProduct(user: SessionUser, id: string, data: any) {
  const canEdit = await hasPermission(user, ModuleName.INVENTORY, ActionName.EDIT);
  if (!canEdit) throw new Error("FORBIDDEN: You do not have permission to edit products.");

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found.");

  // Check barcode uniqueness if changed
  if (data.barcode && data.barcode.trim() && data.barcode !== existing.barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode.trim() },
    });
    if (existingBarcode) {
      throw new Error(`Barcode "${data.barcode}" already exists on another product.`);
    }
  }

  // Validate prices
  if (data.basePrice !== undefined && data.basePrice < 0) {
    throw new Error("Base price cannot be negative.");
  }
  if (data.taxRate !== undefined && (data.taxRate < 0 || data.taxRate > 100)) {
    throw new Error("Tax rate must be between 0 and 100%.");
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.barcode !== undefined && { barcode: data.barcode ? data.barcode.trim() : null }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category && { category: data.category.trim() }),
      ...(data.unit && { unit: data.unit }),
      ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
      ...(data.minStockAlert !== undefined && { minStockAlert: data.minStockAlert }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "UPDATE_PRODUCT",
    entityType: "PRODUCT",
    entityId: id,
    previousState: existing,
    newState: updated,
  });

  return updated;
}
