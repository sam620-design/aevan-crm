import { prisma } from "../prisma";
import { SessionUser } from "../auth";
import {
  Role,
  ModuleName,
  ActionName,
  ServiceStatus,
  ServiceCategory,
  ServiceBillingStatus,
  StaffAccessType,
} from "@prisma/client";
import { hasPermission } from "../permissions";
import {
  canUserAccessStaffData,
  getAuthorizedStaffIdsForUser,
} from "./staff-access.service";
import { logAuditEvent } from "../audit";

export interface CreateServiceInput {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  serviceAddress: string;
  propertyType?: string | null;
  propertySize?: string | null;
  locationId?: string | null;
  category?: ServiceCategory;
  customCategory?: string | null;
  requirements?: string | null;
  scheduledDate: string | Date;
  timeSlot?: string | null;
  assignedStaffId?: string | null;
  estimatedPrice?: number;
}

export interface UpdateServiceStatusInput {
  status: ServiceStatus;
  reason?: string | null;
  finalPrice?: number | null;
  completionNotes?: string | null;
  beforePhotos?: string[];
  afterPhotos?: string[];
  materialsUsed?: any;
  followUpDate?: string | Date | null;
}

/**
 * Valid lifecycle transitions for cleaning services:
 * SCHEDULED -> ARRIVED -> IN_PROGRESS -> COMPLETED
 * Supports RESCHEDULED and CANCELLED
 */
const VALID_STATUS_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
  SCHEDULED: [ServiceStatus.ARRIVED, ServiceStatus.RESCHEDULED, ServiceStatus.CANCELLED],
  ARRIVED: [ServiceStatus.IN_PROGRESS, ServiceStatus.CANCELLED],
  IN_PROGRESS: [ServiceStatus.COMPLETED, ServiceStatus.CANCELLED],
  RESCHEDULED: [ServiceStatus.SCHEDULED, ServiceStatus.ARRIVED, ServiceStatus.CANCELLED],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Creates a new cleaning service job with atomic monotonic number sequencing.
 */
export async function createCleaningService(
  caller: SessionUser,
  data: CreateServiceInput
) {
  // Server-side authorization check
  const isAuthorized = await hasPermission(caller, ModuleName.SERVICES, ActionName.CREATE);
  if (!isAuthorized) {
    throw new Error("UNAUTHORIZED: Missing permission to create services");
  }

  // If assigning staff member, verify caller's operational assignment rights
  if (data.assignedStaffId && data.assignedStaffId !== caller.id) {
    const canAssign = await canUserAccessStaffData(
      caller,
      data.assignedStaffId,
      StaffAccessType.MANAGEMENT_ASSIGNMENT
    );
    if (!canAssign) {
      throw new Error("FORBIDDEN: You are not authorized to assign this staff member");
    }
  }

  // Atomic transactional number generation
  return prisma.$transaction(async (tx) => {
    const config = await tx.companyConfig.upsert({
      where: { id: "default" },
      update: { nextServiceNumber: { increment: 1 } },
      create: { id: "default", nextServiceNumber: 1002 },
    });

    const prefix = config.servicePrefix || "SRV-";
    const nextNum = (config.nextServiceNumber || 1001) - 1;
    const serviceNumber = `${prefix}${String(nextNum).padStart(6, "0")}`;

    const service = await tx.cleaningService.create({
      data: {
        serviceNumber,
        customerId: data.customerId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        serviceAddress: data.serviceAddress,
        propertyType: data.propertyType || "Residential",
        propertySize: data.propertySize || null,
        locationId: data.locationId || null,
        category: data.category || ServiceCategory.DEEP_CLEANING,
        customCategory: data.customCategory || null,
        requirements: data.requirements || null,
        scheduledDate: new Date(data.scheduledDate),
        timeSlot: data.timeSlot || null,
        assignedStaffId: data.assignedStaffId || null,
        createdById: caller.id,
        status: ServiceStatus.SCHEDULED,
        estimatedPrice: data.estimatedPrice || 0,
        billingStatus: ServiceBillingStatus.UNBILLED,
      },
      include: {
        customer: true,
        assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await logAuditEvent({
      userId: caller.id,
      action: "CREATE_SERVICE",
      entityType: "CleaningService",
      entityId: service.id,
      newState: {
        serviceNumber: service.serviceNumber,
        category: service.category,
        assignedStaffId: service.assignedStaffId,
        scheduledDate: service.scheduledDate,
      },
    });

    return service;
  });
}

/**
 * Lists cleaning service jobs with strict staff-level data isolation.
 */
export async function getCleaningServices(
  caller: SessionUser,
  filters: {
    status?: ServiceStatus;
    category?: ServiceCategory;
    staffId?: string;
    customerId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const isAuthorized = await hasPermission(caller, ModuleName.SERVICES, ActionName.VIEW);
  if (!isAuthorized) {
    throw new Error("UNAUTHORIZED: Missing permission to view services");
  }

  // 1. Resolve authorized Staff IDs for the caller
  const authorizedStaffIds = await getAuthorizedStaffIdsForUser(caller);

  // 2. Build where clause enforcing data boundaries
  const where: any = {};

  if (authorizedStaffIds !== null) {
    // Non-superadmin: restricted to authorized staff jobs or jobs they personally created
    where.OR = [
      { assignedStaffId: { in: authorizedStaffIds } },
      { createdById: caller.id },
    ];
  }

  // If a specific staffId filter was requested, verify caller has access to that staff
  if (filters.staffId) {
    if (authorizedStaffIds !== null && !authorizedStaffIds.includes(filters.staffId)) {
      throw new Error("FORBIDDEN: You do not have access to this staff member's records");
    }
    where.assignedStaffId = filters.staffId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.customerId) where.customerId = filters.customerId;

  if (filters.startDate || filters.endDate) {
    where.scheduledDate = {};
    if (filters.startDate) where.scheduledDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.scheduledDate.lte = new Date(filters.endDate);
  }

  if (filters.search) {
    where.OR = [
      ...(where.OR || []),
      { serviceNumber: { contains: filters.search, mode: "insensitive" } },
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { customerPhone: { contains: filters.search, mode: "insensitive" } },
      { serviceAddress: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.cleaningService.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.cleaningService.count({ where }),
  ]);

  return { items, total };
}

/**
 * IDOR-safe fetch of a single cleaning service record.
 */
export async function getCleaningServiceById(
  caller: SessionUser,
  id: string
) {
  const isAuthorized = await hasPermission(caller, ModuleName.SERVICES, ActionName.VIEW);
  if (!isAuthorized) {
    throw new Error("UNAUTHORIZED: Missing permission to view services");
  }

  const service = await prisma.cleaningService.findUnique({
    where: { id },
    include: {
      customer: true,
      location: true,
      assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      sale: true,
    },
  });

  if (!service) {
    throw new Error("Service record not found");
  }

  // IDOR check: Superadmin has universal bypass
  if (caller.role !== Role.SUPERADMIN) {
    const isOwner = service.createdById === caller.id;
    const isAssigned = service.assignedStaffId === caller.id;
    let isSupervised = false;

    if (service.assignedStaffId) {
      isSupervised = await canUserAccessStaffData(
        caller,
        service.assignedStaffId,
        StaffAccessType.VIEW
      );
    }

    if (!isOwner && !isAssigned && !isSupervised) {
      throw new Error("FORBIDDEN: You are not authorized to view this service job");
    }
  }

  return service;
}

/**
 * Validates and transitions a service's lifecycle status.
 * SCHEDULED -> ARRIVED -> IN_PROGRESS -> COMPLETED
 */
export async function updateServiceStatus(
  caller: SessionUser,
  id: string,
  input: UpdateServiceStatusInput
) {
  const service = await getCleaningServiceById(caller, id);

  // Validate state machine transition
  const allowedNext = VALID_STATUS_TRANSITIONS[service.status];
  const isSuper = caller.role === Role.SUPERADMIN;

  if (!allowedNext.includes(input.status) && !isSuper) {
    throw new Error(
      `INVALID_TRANSITION: Cannot transition service from ${service.status} to ${input.status}`
    );
  }

  // Terminal state protection: Completed or Cancelled cannot be changed without Superadmin override
  if (
    (service.status === ServiceStatus.COMPLETED || service.status === ServiceStatus.CANCELLED) &&
    !isSuper
  ) {
    throw new Error("FORBIDDEN: Only Superadmin can reopen a finalized or cancelled service");
  }

  const updated = await prisma.cleaningService.update({
    where: { id },
    data: {
      status: input.status,
      previousStatus: service.status,
      statusReason: input.reason || null,
      finalPrice: input.finalPrice !== undefined && input.finalPrice !== null ? input.finalPrice : service.finalPrice,
      completionNotes: input.completionNotes || service.completionNotes,
      beforePhotos: input.beforePhotos?.length ? input.beforePhotos : service.beforePhotos,
      afterPhotos: input.afterPhotos?.length ? input.afterPhotos : service.afterPhotos,
      materialsUsed: input.materialsUsed !== undefined ? input.materialsUsed : service.materialsUsed,
      completedAt: input.status === ServiceStatus.COMPLETED ? new Date() : service.completedAt,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : service.followUpDate,
    },
    include: {
      customer: true,
      assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  await logAuditEvent({
    userId: caller.id,
    action: `SERVICE_STATUS_${input.status}`,
    entityType: "CleaningService",
    entityId: id,
    previousState: { status: service.status },
    newState: {
      status: input.status,
      reason: input.reason,
      completedAt: updated.completedAt,
    },
  });

  return updated;
}

/**
 * Assigns or reassigns a staff member to an existing service job.
 */
export async function assignServiceStaff(
  caller: SessionUser,
  serviceId: string,
  staffId: string,
  notes?: string | null
) {
  const isAuthorized = await hasPermission(caller, ModuleName.SERVICES, ActionName.ASSIGN);
  if (!isAuthorized) {
    throw new Error("UNAUTHORIZED: Missing permission to assign services");
  }

  // Verify caller's authority to assign target staff member
  const canAssign = await canUserAccessStaffData(
    caller,
    staffId,
    StaffAccessType.MANAGEMENT_ASSIGNMENT
  );
  if (!canAssign) {
    throw new Error("FORBIDDEN: You do not have management authority over this staff member");
  }

  const service = await getCleaningServiceById(caller, serviceId);

  const updated = await prisma.cleaningService.update({
    where: { id: serviceId },
    data: {
      assignedStaffId: staffId,
      statusReason: notes ? `Assigned with note: ${notes}` : service.statusReason,
    },
    include: {
      assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  await logAuditEvent({
    userId: caller.id,
    action: "ASSIGN_SERVICE_STAFF",
    entityType: "CleaningService",
    entityId: serviceId,
    previousState: { assignedStaffId: service.assignedStaffId },
    newState: { assignedStaffId: staffId, notes },
  });

  return updated;
}
