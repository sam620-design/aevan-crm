import { prisma } from "./prisma";
import {
  ModuleName,
  ActionName,
  DataScope,
  PermissionChangeType,
} from "@prisma/client";

export interface LogPermissionChangeParams {
  targetUserId: string;
  changedById: string;
  module: ModuleName;
  action: ActionName;
  previousScope?: DataScope | null;
  newScope?: DataScope | null;
  changeType: PermissionChangeType;
  reason: string;
}

/**
 * Creates an immutable audit trail entry whenever a permission is granted, modified, or revoked.
 */
export async function logPermissionChange(params: LogPermissionChangeParams) {
  return prisma.permissionAuditLog.create({
    data: {
      targetUserId: params.targetUserId,
      changedById: params.changedById,
      module: params.module,
      action: params.action,
      previousScope: params.previousScope ?? null,
      newScope: params.newScope ?? null,
      changeType: params.changeType,
      reason: params.reason,
    },
  });
}

export interface LogAuditEventParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousState?: any;
  newState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * General tamper-evident audit logging for sensitive CRUD, financial, and inventory actions.
 */
export async function logAuditEvent(params: LogAuditEventParams) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      previousState: params.previousState ? JSON.parse(JSON.stringify(params.previousState)) : null,
      newState: params.newState ? JSON.parse(JSON.stringify(params.newState)) : null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
