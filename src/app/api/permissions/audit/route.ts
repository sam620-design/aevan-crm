import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperadmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperadmin(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Only Superadmin can access permission audit logs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("targetUserId");

    const whereClause: any = {};
    if (targetUserId) {
      whereClause.targetUserId = targetUserId;
    }

    const logs = await prisma.permissionAuditLog.findMany({
      where: whereClause,
      include: {
        targetUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        changedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET permission audit logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
