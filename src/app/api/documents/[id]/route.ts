import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const doc = await prisma.document.findUnique({ where: { id: params.id } });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch document" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    await prisma.document.delete({ where: { id: params.id } });

    await logAuditEvent({
      userId: user.id,
      action: "DELETE_DOCUMENT",
      entityType: "DOCUMENT",
      entityId: params.id,
      previousState: existing,
      newState: null,
    });

    return NextResponse.json({ success: true, message: "Document deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
  }
}
