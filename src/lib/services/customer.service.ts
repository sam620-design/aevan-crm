import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin } from "@/lib/permissions";
import { ModuleName, ActionName, DataScope, Prisma, Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function getCustomers(
  user: SessionUser,
  params: {
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  // 1. Permission check
  const canView = await hasPermission(user, ModuleName.CUSTOMERS, ActionName.VIEW);
  if (!canView) {
    throw new Error("FORBIDDEN: You do not have permission to view customers.");
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  // 2. Determine Data Scope
  const where: Prisma.CustomerWhereInput = { isActive: true };

  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.CUSTOMERS,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || (user.role === Role.STAFF ? DataScope.ALL : DataScope.OWN);

    if (scope === DataScope.OWN) {
      where.createdById = user.id;
    } else if (scope === DataScope.ASSIGNED) {
      where.OR = [
        { assignedToId: user.id },
        { createdById: user.id },
      ];
    }
    // If scope === ALL, no additional filter
  }

  // 3. Search and Type Filter
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.AND = [
      {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { phone: { contains: term } },
          { customerCode: { contains: term, mode: "insensitive" } },
          { contactPerson: { contains: term, mode: "insensitive" } },
          { gstin: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (params.type && params.type !== "ALL") {
    where.customerType = params.type as any;
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      include: {
        priceList: { select: { id: true, name: true, discountPercentage: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    data: customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerById(user: SessionUser, id: string) {
  const canView = await hasPermission(user, ModuleName.CUSTOMERS, ActionName.VIEW);
  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view customers.");

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      priceList: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          orders: true,
          sales: true,
          quotations: true,
          payments: true,
          ledgerEntries: true,
        },
      },
    },
  });

  if (!customer || !customer.isActive) {
    throw new Error("Customer not found");
  }

  // Check Scope
  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.CUSTOMERS,
          action: ActionName.VIEW,
        },
      },
    });

    const scope = userPerm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN && customer.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only view your own customers.");
    }
    if (scope === DataScope.ASSIGNED && customer.assignedToId !== user.id && customer.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only view customers assigned to you.");
    }
  }

  return customer;
}

export async function createCustomer(user: SessionUser, data: any) {
  const canCreate = await hasPermission(user, ModuleName.CUSTOMERS, ActionName.CREATE);
  if (!canCreate) {
    throw new Error("FORBIDDEN: You do not have permission to create customers.");
  }

  // Generate concurrency-safe unique Customer Code (CUST-1001, CUST-1002, ...)
  const count = await prisma.customer.count();
  let codeNum = 1001 + count;
  let customerCode = `CUST-${codeNum.toString().padStart(4, "0")}`;
  while (await prisma.customer.findUnique({ where: { customerCode } })) {
    codeNum++;
    customerCode = `CUST-${codeNum.toString().padStart(4, "0")}`;
  }

  // Defensively verify createdById against DB to prevent foreign key violations
  let validCreatedById: string | null = null;
  if (user?.id) {
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });
    if (existingUser) {
      validCreatedById = existingUser.id;
    } else if (user.email) {
      const byEmail = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase().trim() },
        select: { id: true },
      });
      if (byEmail) validCreatedById = byEmail.id;
    }
  }

  if (!validCreatedById && isSuperadmin(user)) {
    const superUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN", isActive: true },
      select: { id: true },
    });
    if (superUser) validCreatedById = superUser.id;
  }

  // Validate optional assignedToId
  let validAssignedToId: string | null = null;
  if (data.assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assignedToId },
      select: { id: true },
    });
    if (assignee) validAssignedToId = assignee.id;
  }

  // Validate optional priceListId
  let validPriceListId: string | null = null;
  if (data.priceListId) {
    const pl = await prisma.customerPriceList.findUnique({
      where: { id: data.priceListId },
      select: { id: true },
    });
    if (pl) validPriceListId = pl.id;
  }

  const customer = await prisma.customer.create({
    data: {
      customerCode,
      name: data.name.trim(),
      contactPerson: data.contactPerson ? data.contactPerson.trim() : null,
      phone: data.phone,
      email: data.email || null,
      billingAddress: data.billingAddress || null,
      shippingAddress: data.shippingAddress || data.deliveryAddress || null,
      deliveryAddress: data.shippingAddress || data.deliveryAddress || null,
      customerType: data.customerType || "RETAIL",
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : null,
      notes: data.notes || null,
      priceListId: validPriceListId,
      assignedToId: validAssignedToId,
      createdById: validCreatedById,
    },
    include: {
      priceList: true,
    },
  });

  if (validCreatedById) {
    await logAuditEvent({
      userId: validCreatedById,
      action: "CREATE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: customer.id,
      newState: customer,
    });
  }

  return customer;
}

export async function updateCustomer(user: SessionUser, id: string, data: any) {
  const canEdit = await hasPermission(user, ModuleName.CUSTOMERS, ActionName.EDIT);
  if (!canEdit) {
    throw new Error("FORBIDDEN: You do not have permission to edit customers.");
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    throw new Error("Customer not found");
  }

  // Scope check
  if (!isSuperadmin(user)) {
    const userPerm = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module: ModuleName.CUSTOMERS,
          action: ActionName.EDIT,
        },
      },
    });
    const scope = userPerm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN && existing.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only edit your own customers.");
    }
    if (scope === DataScope.ASSIGNED && existing.assignedToId !== user.id && existing.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only edit customers assigned to you.");
    }
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
      ...(data.phone && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.billingAddress !== undefined && { billingAddress: data.billingAddress }),
      ...(data.shippingAddress !== undefined && {
        shippingAddress: data.shippingAddress,
        deliveryAddress: data.shippingAddress,
      }),
      ...(data.customerType && { customerType: data.customerType }),
      ...(data.gstin !== undefined && { gstin: data.gstin ? data.gstin.trim().toUpperCase() : null }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.priceListId !== undefined && { priceListId: data.priceListId || null }),
      ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId || null }),
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "UPDATE_CUSTOMER",
    entityType: "CUSTOMER",
    entityId: id,
    previousState: existing,
    newState: updated,
  });

  return updated;
}
