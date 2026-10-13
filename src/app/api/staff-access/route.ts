import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  grantStaffAccess,
  revokeStaffAccess,
  listStaffAccessGrants,
} from "@/lib/services/staff-access.service";
import {
  createStaffAccessGrantSchema,
  revokeStaffAccessGrantSchema,
} from "@/lib/validations/service.schema";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId") || undefined;

    const grants = await listStaffAccessGrants(user, adminId);

    // If Superadmin, also provide the active Admin list and Staff list for selector UI
    let admins: any[] = [];
    let staff: any[] = [];

    if (user.role === Role.SUPERADMIN) {
      [admins, staff] = await Promise.all([
        prisma.user.findMany({
          where: { role: Role.ADMIN, isActive: true },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          where: { role: Role.STAFF, isActive: true },
          select: { id: true, name: true, email: true, phone: true },
          orderBy: { name: "asc" },
        }),
      ]);
    }

    return NextResponse.json({ grants, admins, staff });
  } catch (error: any) {
    console.error("Staff access GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch staff access grants" },
      { status: error.message?.includes("UNAUTHORIZED") ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== Role.SUPERADMIN) {
      return NextResponse.json(
        { error: "Only Superadmin can grant Admin-to-Staff visibility" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createStaffAccessGrantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const grant = await grantStaffAccess(user, parsed.data);
    return NextResponse.json({ success: true, grant }, { status: 201 });
  } catch (error: any) {
    console.error("Staff access grant POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to grant staff access" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== Role.SUPERADMIN) {
      return NextResponse.json(
        { error: "Only Superadmin can revoke Admin-to-Staff visibility" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = revokeStaffAccessGrantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const revoked = await revokeStaffAccess(user, parsed.data);
    return NextResponse.json({ success: true, revoked });
  } catch (error: any) {
    console.error("Staff access revoke DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke staff access" },
      { status: 400 }
    );
  }
}
