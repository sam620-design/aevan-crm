import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { isSuperadmin } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

export async function getLocations(user: SessionUser) {
  return prisma.location.findMany({
    include: {
      stockBalances: {
        where: { quantity: { gt: 0 } },
        include: { product: { select: { id: true, name: true, sku: true } } },
      },
      _count: {
        select: {
          stockMovements: true,
          sourceTransfers: true,
          destTransfers: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createLocation(user: SessionUser, data: any) {
  // STRICT RULE: Only Superadmin can create locations
  if (!isSuperadmin(user)) {
    throw new Error("FORBIDDEN: Only Superadmin is authorized to create inventory locations.");
  }

  const existingCode = await prisma.location.findUnique({
    where: { code: data.code.trim().toUpperCase() },
  });
  if (existingCode) {
    throw new Error(`Location code "${data.code}" already exists.`);
  }

  const location = await prisma.location.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      address: data.address || null,
      isDefault: data.isDefault || false,
      isActive: true,
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "CREATE_LOCATION",
    entityType: "LOCATION",
    entityId: location.id,
    newState: location,
  });

  return location;
}

export async function deactivateLocation(user: SessionUser, id: string) {
  // STRICT RULE: Only Superadmin can deactivate locations
  if (!isSuperadmin(user)) {
    throw new Error("FORBIDDEN: Only Superadmin is authorized to deactivate inventory locations.");
  }

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      stockBalances: true,
    },
  });

  if (!location) throw new Error("Location not found.");
  if (location.isDefault) {
    throw new Error("Cannot deactivate primary default location.");
  }

  // CRITICAL REQUIREMENT: Check unresolved stock balances
  const totalStock = location.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
  if (totalStock > 0) {
    throw new Error(
      `Cannot deactivate location "${location.name}". It currently has ${totalStock} units of unresolved stock. Transfer or resolve all physical stock to 0 before deactivation.`
    );
  }

  // Deactivate without deleting history
  const updated = await prisma.location.update({
    where: { id },
    data: { isActive: false },
  });

  await logAuditEvent({
    userId: user.id,
    action: "DEACTIVATE_LOCATION",
    entityType: "LOCATION",
    entityId: id,
    previousState: location,
    newState: updated,
  });

  return updated;
}
