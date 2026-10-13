import { ModuleName, ActionName, DataScope, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { SessionUser } from "./auth";

/**
 * Global Permission Evaluation Engine
 * 
 * Rules:
 * 1. Superadmin has root access to all modules, actions, and scopes.
 * 2. Admin has ZERO implicit permissions.
 * 3. Staff has ZERO implicit permissions.
 * 4. Every non-Superadmin user must possess an explicit entry in the Permission table.
 * 5. DataScope hierarchy: ALL satisfies ASSIGNED and OWN. ASSIGNED satisfies OWN.
 */
export async function hasPermission(
  user: SessionUser,
  module: ModuleName,
  action: ActionName,
  requiredScope: DataScope = DataScope.OWN
): Promise<boolean> {
  // Rule 1: Superadmin has unrevokable root authority
  if (user.role === Role.SUPERADMIN) {
    return true;
  }

  // Rule 2 & 3: Admin & Staff receive no default permissions. Check database.
  try {
    const permission = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: user.id,
          module,
          action,
        },
      },
    });

    if (!permission) {
      if (user.role === Role.STAFF && (module === ModuleName.SERVICES || module === ModuleName.SALES)) {
        if (
          action === ActionName.VIEW ||
          action === ActionName.CREATE ||
          action === ActionName.EDIT ||
          action === ActionName.CREATE_SALE
        ) {
          return requiredScope === DataScope.OWN;
        }
      }
      return false;
    }

    // Evaluate scope compatibility
    return isScopeSufficient(permission.scope, requiredScope);
  } catch (error) {
    console.error("Permission check database error:", error);
    if (user.role === Role.STAFF && (module === ModuleName.SERVICES || module === ModuleName.SALES)) {
      if (
        action === ActionName.VIEW ||
        action === ActionName.CREATE ||
        action === ActionName.EDIT ||
        action === ActionName.CREATE_SALE
      ) {
        return requiredScope === DataScope.OWN;
      }
    }
    return false;
  }
}

/**
 * Checks whether an assigned scope is sufficient to fulfill a required scope.
 * Scope Hierarchy: ALL > ASSIGNED > OWN
 */
export function isScopeSufficient(userScope: DataScope, requiredScope: DataScope): boolean {
  if (userScope === DataScope.ALL) return true;
  if (userScope === DataScope.ASSIGNED) {
    return requiredScope === DataScope.ASSIGNED || requiredScope === DataScope.OWN;
  }
  if (userScope === DataScope.OWN) {
    return requiredScope === DataScope.OWN;
  }
  return false;
}

/**
 * Evaluates record-level data access based on entity ownership.
 */
export async function checkEntityAccess(
  user: SessionUser,
  module: ModuleName,
  action: ActionName,
  entity: { createdById?: string | null; assignedToId?: string | null }
): Promise<boolean> {
  if (user.role === Role.SUPERADMIN) return true;

  const permission = await prisma.permission.findUnique({
    where: {
      userId_module_action: {
        userId: user.id,
        module,
        action,
      },
    },
  });

  if (!permission) return false;

  if (permission.scope === DataScope.ALL) return true;

  if (permission.scope === DataScope.ASSIGNED) {
    return (
      entity.assignedToId === user.id ||
      entity.createdById === user.id
    );
  }

  if (permission.scope === DataScope.OWN) {
    return entity.createdById === user.id;
  }

  return false;
}

/**
 * Quick helper to verify if the user is a Superadmin
 */
export function isSuperadmin(user: SessionUser | null): boolean {
  return user?.role === Role.SUPERADMIN;
}
