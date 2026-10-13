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

export function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);
  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey === "authorization" ||
      lowerKey === "apikey"
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (val && typeof val === "object") {
      sanitized[key] = redactSensitiveData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * General tamper-evident audit logging for sensitive CRUD, financial, and inventory actions.
 */
export async function logAuditEvent(params: LogAuditEventParams) {
  const sanitizedPrevious = params.previousState ? redactSensitiveData(JSON.parse(JSON.stringify(params.previousState))) : null;
  const sanitizedNew = params.newState ? redactSensitiveData(JSON.parse(JSON.stringify(params.newState))) : null;

  return prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      previousState: sanitizedPrevious,
      newState: sanitizedNew,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
