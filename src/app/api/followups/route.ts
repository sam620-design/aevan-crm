import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { FollowUpType, FollowUpStatus, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Prisma.FollowUpWhereInput = {};

    if (status && status !== "ALL") {
      where.status = status as FollowUpStatus;
    }

    if (type && type !== "ALL") {
      where.type = type as FollowUpType;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { customer: { name: { contains: term, mode: "insensitive" } } },
        { customer: { phone: { contains: term, mode: "insensitive" } } },
        { outcome: { contains: term, mode: "insensitive" } },
      ];
    }

    const followups = await prisma.followUp.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true, customerCode: true } },
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });

    return NextResponse.json({ success: true, followups });
  } catch (error: any) {
    console.error("GET /api/followups error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { customerId, type, scheduledDate, outcome, assignedToId } = body;

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    if (!scheduledDate) {
      return NextResponse.json({ error: "Scheduled date is required" }, { status: 400 });
    }

    const targetAssignedToId = assignedToId || user.id;

    const followup = await prisma.followUp.create({
      data: {
        customerId,
        type: (type as FollowUpType) || FollowUpType.CALL,
        scheduledDate: new Date(scheduledDate),
        status: FollowUpStatus.PENDING,
        outcome: outcome || null,
        assignedToId: targetAssignedToId,
        createdById: user.id,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, customerCode: true } },
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "CREATE_FOLLOWUP",
      entityType: "FOLLOWUP",
      entityId: followup.id,
      newState: followup,
    });

    return NextResponse.json({ success: true, followup }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/followups error:", error);
    return NextResponse.json({ error: error.message || "Failed to create follow-up" }, { status: 500 });
  }
}
