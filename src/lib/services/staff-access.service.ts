import { prisma } from "../prisma";
import { SessionUser } from "../auth";
import { Role, StaffAccessType } from "@prisma/client";
import { logAuditEvent } from "../audit";

export interface GrantStaffAccessParams {
  adminId: string;
  staffId: string;
  accessType: StaffAccessType;
  reason: string;
}

export interface RevokeStaffAccessParams {
  adminId: string;
  staffId: string;
  accessType: StaffAccessType;
  reason: string;
}

/**
 * Superadmin grants an Admin user view access or management assignment over a specific Staff member.
 * Non-Superadmin callers are strictly rejected.
 */
export async function grantStaffAccess(
  caller: SessionUser,
  params: GrantStaffAccessParams
) {
  if (caller.role !== Role.SUPERADMIN) {
    throw new Error("UNAUTHORIZED: Only Superadmin can grant Admin-to-Staff visibility");
  }

  // Verify Admin exists
  const admin = await prisma.user.findUnique({
    where: { id: params.adminId },
  });
  if (!admin || (admin.role !== Role.ADMIN && admin.role !== Role.SUPERADMIN)) {
    throw new Error("Target user is not an Admin");
  }

  // Verify Staff exists
  const staff = await prisma.user.findUnique({
    where: { id: params.staffId },
  });
  if (!staff || staff.role !== Role.STAFF) {
    throw new Error("Target subject is not a Staff member");
  }

  // Upsert the access grant
  const grant = await prisma.staffAccessGrant.upsert({
    where: {
      adminId_staffId_accessType: {
        adminId: params.adminId,
        staffId: params.staffId,
        accessType: params.accessType,
      },
    },
    update: {
      isActive: true,
      grantedById: caller.id,
      revokedAt: null,
      revokedById: null,
      revocationReason: null,
    },
    create: {
      adminId: params.adminId,
      staffId: params.staffId,
      accessType: params.accessType,
      grantedById: caller.id,
      isActive: true,
    },
    include: {
      admin: { select: { id: true, name: true, email: true, role: true } },
      staff: { select: { id: true, name: true, email: true, role: true } },
      grantedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Tamper-evident audit log
  await logAuditEvent({
    userId: caller.id,
    action: `GRANT_STAFF_${params.accessType}`,
    entityType: "StaffAccessGrant",
    entityId: grant.id,
    newState: {
      adminId: params.adminId,
      staffId: params.staffId,
      accessType: params.accessType,
      reason: params.reason,
    },
  });

  return grant;
}

/**
 * Superadmin revokes an Admin's view access or management assignment over a Staff member.
 */
export async function revokeStaffAccess(
  caller: SessionUser,
  params: RevokeStaffAccessParams
) {
  if (caller.role !== Role.SUPERADMIN) {
    throw new Error("UNAUTHORIZED: Only Superadmin can revoke Admin-to-Staff visibility");
  }

  const existing = await prisma.staffAccessGrant.findUnique({
    where: {
      adminId_staffId_accessType: {
        adminId: params.adminId,
        staffId: params.staffId,
        accessType: params.accessType,
      },
    },
  });

  if (!existing || !existing.isActive) {
    throw new Error("No active access grant exists for this Admin, Staff, and access type");
  }

  const updated = await prisma.staffAccessGrant.update({
    where: { id: existing.id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedById: caller.id,
      revocationReason: params.reason,
    },
  });

  await logAuditEvent({
    userId: caller.id,
    action: `REVOKE_STAFF_${params.accessType}`,
    entityType: "StaffAccessGrant",
    entityId: updated.id,
    previousState: { isActive: true },
    newState: {
      isActive: false,
      revocationReason: params.reason,
    },
  });

  return updated;
}

/**
 * Lists active and historical Admin-to-Staff grants.
 */
export async function listStaffAccessGrants(
  caller: SessionUser,
  adminId?: string
) {
  if (caller.role !== Role.SUPERADMIN && caller.role !== Role.ADMIN) {
    throw new Error("UNAUTHORIZED");
  }

  const targetAdminId = caller.role === Role.ADMIN ? caller.id : adminId;

  return prisma.staffAccessGrant.findMany({
    where: targetAdminId ? { adminId: targetAdminId } : undefined,
    include: {
      admin: { select: { id: true, name: true, email: true, role: true } },
      staff: { select: { id: true, name: true, email: true, phone: true } },
      grantedBy: { select: { id: true, name: true, email: true } },
      revokedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Returns the list of Staff UUIDs whose data is accessible to the caller.
 * - Superadmin: returns null (meaning unrestricted/all staff).
 * - Admin: returns array of authorized Staff UUIDs based on active grants, plus the Admin's own ID.
 * - Staff: returns only [caller.id].
 */
export async function getAuthorizedStaffIdsForUser(
  caller: SessionUser,
  requiredType?: StaffAccessType
): Promise<string[] | null> {
  if (caller.role === Role.SUPERADMIN) {
    return null; // Null indicates Universal Bypass
  }

  if (caller.role === Role.ADMIN) {
    const grants = await prisma.staffAccessGrant.findMany({
      where: {
        adminId: caller.id,
        isActive: true,
        ...(requiredType ? { accessType: requiredType } : {}),
      },
      select: { staffId: true },
    });

    const staffIds = grants.map((g) => g.staffId);
    if (!staffIds.includes(caller.id)) {
      staffIds.push(caller.id);
    }
    return staffIds;
  }

  // Role.STAFF
  return [caller.id];
}

/**
 * Central authorization predicate verifying if caller can access target staff's data.
 */
export async function canUserAccessStaffData(
  caller: SessionUser,
  targetStaffId: string,
  requiredType: StaffAccessType = StaffAccessType.VIEW
): Promise<boolean> {
  if (caller.role === Role.SUPERADMIN) {
    return true;
  }

  if (caller.id === targetStaffId) {
    return true;
  }

  if (caller.role === Role.ADMIN) {
    const grant = await prisma.staffAccessGrant.findFirst({
      where: {
        adminId: caller.id,
        staffId: targetStaffId,
        isActive: true,
        accessType:
          requiredType === StaffAccessType.VIEW
            ? { in: [StaffAccessType.VIEW, StaffAccessType.MANAGEMENT_ASSIGNMENT] }
            : StaffAccessType.MANAGEMENT_ASSIGNMENT,
      },
    });
    return Boolean(grant);
  }

  return false;
}
