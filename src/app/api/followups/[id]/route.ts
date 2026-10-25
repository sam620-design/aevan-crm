import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { FollowUpType, FollowUpStatus } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const followup = await prisma.followUp.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!followup) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    return NextResponse.json({ success: true, followup });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch follow-up" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.followUp.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });

    const body = await request.json();
    const { type, scheduledDate, status, outcome, assignedToId } = body;

    const updated = await prisma.followUp.update({
      where: { id: params.id },
      data: {
        ...(type !== undefined && { type: type as FollowUpType }),
        ...(scheduledDate !== undefined && { scheduledDate: new Date(scheduledDate) }),
        ...(status !== undefined && { status: status as FollowUpStatus }),
        ...(outcome !== undefined && { outcome }),
        ...(assignedToId !== undefined && { assignedToId }),
      },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_FOLLOWUP",
      entityType: "FOLLOWUP",
      entityId: params.id,
      previousState: existing,
      newState: updated,
    });

    return NextResponse.json({ success: true, followup: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update follow-up" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.followUp.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });

    await prisma.followUp.delete({ where: { id: params.id } });

    await logAuditEvent({
      userId: user.id,
      action: "DELETE_FOLLOWUP",
      entityType: "FOLLOWUP",
      entityId: params.id,
      previousState: existing,
      newState: null,
    });

    return NextResponse.json({ success: true, message: "Follow-up deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete follow-up" }, { status: 500 });
  }
}
