import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const documentType = searchParams.get("type");
    const entityType = searchParams.get("entity");

    const where: Prisma.DocumentWhereInput = {};

    if (documentType && documentType !== "ALL") {
      where.documentType = documentType;
    }

    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { fileName: { contains: term, mode: "insensitive" } },
        { documentType: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { fileName, documentType, entityType, entityId, fileSize, fileUrl, notes } = body;

    if (!fileName || !fileName.trim()) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 });
    }

    const doc = await prisma.document.create({
      data: {
        fileName: fileName.trim(),
        documentType: documentType || "GENERAL",
        entityType: entityType || "GENERAL",
        entityId: entityId || "system",
        fileSize: Number(fileSize) || 1024 * 50,
        fileUrl: fileUrl || "#",
        notes: notes || null,
        uploadedById: user.id,
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPLOAD_DOCUMENT",
      entityType: "DOCUMENT",
      entityId: doc.id,
      newState: doc,
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json({ error: error.message || "Failed to register document" }, { status: 500 });
  }
}
