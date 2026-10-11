import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isSuperadmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logPermissionChange } from "@/lib/audit";
import {
  ModuleName,
  ActionName,
  DataScope,
  PermissionChangeType,
} from "@prisma/client";

const grantPermissionSchema = z.object({
  targetUserId: z.string().uuid(),
  module: z.nativeEnum(ModuleName),
  action: z.nativeEnum(ActionName),
  scope: z.nativeEnum(DataScope).default(DataScope.OWN),
  reason: z.string().min(5, "Mandatory audit reason must be provided (min 5 characters)"),
});

const revokePermissionSchema = z.object({
  targetUserId: z.string().uuid(),
  module: z.nativeEnum(ModuleName),
  action: z.nativeEnum(ActionName),
  reason: z.string().min(5, "Mandatory audit reason must be provided for revoking permissions"),
});

// GET /api/permissions?userId=...
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperadmin(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Only Superadmin can view raw permission matrices." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId query parameter required" }, { status: 400 });
    }

    const permissions = await prisma.permission.findMany({
      where: { userId },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("GET permissions error:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}

// POST /api/permissions (Grant or Modify permission)
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT HIERARCHY: Only Superadmin can grant or modify permissions
    if (!isSuperadmin(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: ONLY Superadmin is authorized to grant or modify permissions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = grantPermissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { targetUserId, module, action, scope, reason } = parseResult.data;

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (targetUser.role === "SUPERADMIN") {
      return NextResponse.json(
        { error: "Superadmin inherently possesses all permissions; cannot assign individual permission records." },
        { status: 400 }
      );
    }

    // Check existing permission
    const existing = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: targetUserId,
          module,
          action,
        },
      },
    });

    let resultPermission;
    let changeType: PermissionChangeType = PermissionChangeType.GRANT;
    let previousScope: DataScope | null = null;

    if (existing) {
      changeType = PermissionChangeType.MODIFY;
      previousScope = existing.scope;

      resultPermission = await prisma.permission.update({
        where: { id: existing.id },
        data: {
          scope,
          grantedById: currentUser.id,
          grantedAt: new Date(),
        },
      });
    } else {
      resultPermission = await prisma.permission.create({
        data: {
          userId: targetUserId,
          module,
          action,
          scope,
          grantedById: currentUser.id,
        },
      });
    }

    // Record immutable audit trail
    await logPermissionChange({
      targetUserId,
      changedById: currentUser.id,
      module,
      action,
      previousScope,
      newScope: scope,
      changeType,
      reason,
    });

    return NextResponse.json({
      success: true,
      changeType,
      permission: resultPermission,
    });
  } catch (error) {
    console.error("POST permission error:", error);
    return NextResponse.json({ error: "Failed to update permission" }, { status: 500 });
  }
}

// DELETE /api/permissions (Revoke permission)
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT HIERARCHY: Only Superadmin can revoke permissions
    if (!isSuperadmin(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: ONLY Superadmin is authorized to revoke permissions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = revokePermissionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { targetUserId, module, action, reason } = parseResult.data;

    const existing = await prisma.permission.findUnique({
      where: {
        userId_module_action: {
          userId: targetUserId,
          module,
          action,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Permission does not exist for this user" }, { status: 404 });
    }

    await prisma.permission.delete({
      where: { id: existing.id },
    });

    // Record immutable audit trail
    await logPermissionChange({
      targetUserId,
      changedById: currentUser.id,
      module,
      action,
      previousScope: existing.scope,
      newScope: null,
      changeType: PermissionChangeType.REVOKE,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Permission revoked successfully",
    });
  } catch (error) {
    console.error("DELETE permission error:", error);
    return NextResponse.json({ error: "Failed to revoke permission" }, { status: 500 });
  }
}
