import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCleaningServiceById } from "@/lib/services/cleaning-service.service";
import { prisma } from "@/lib/prisma";
import { updateCleaningServiceSchema } from "@/lib/validations/service.schema";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = await getCleaningServiceById(user, params.id);
    return NextResponse.json({ service });
  } catch (error: any) {
    console.error("Service detail GET error:", error);
    const status = error.message?.includes("UNAUTHORIZED")
      ? 401
      : error.message?.includes("FORBIDDEN")
      ? 403
      : error.message?.includes("not found")
      ? 404
      : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch service" }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify existing service and access
    const existing = await getCleaningServiceById(user, params.id);

    const body = await req.json();
    const parsed = updateCleaningServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await prisma.cleaningService.update({
      where: { id: params.id },
      data: {
        customerName: parsed.data.customerName || existing.customerName,
        customerPhone: parsed.data.customerPhone || existing.customerPhone,
        customerEmail: parsed.data.customerEmail !== undefined ? parsed.data.customerEmail : existing.customerEmail,
        serviceAddress: parsed.data.serviceAddress || existing.serviceAddress,
        propertyType: parsed.data.propertyType !== undefined ? parsed.data.propertyType : existing.propertyType,
        propertySize: parsed.data.propertySize !== undefined ? parsed.data.propertySize : existing.propertySize,
        requirements: parsed.data.requirements !== undefined ? parsed.data.requirements : existing.requirements,
        scheduledDate: parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : existing.scheduledDate,
        timeSlot: parsed.data.timeSlot !== undefined ? parsed.data.timeSlot : existing.timeSlot,
        estimatedPrice: parsed.data.estimatedPrice !== undefined ? parsed.data.estimatedPrice : existing.estimatedPrice,
      },
      include: {
        customer: true,
        assignedStaff: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_SERVICE_DETAILS",
      entityType: "CleaningService",
      entityId: params.id,
      previousState: { serviceAddress: existing.serviceAddress, estimatedPrice: existing.estimatedPrice },
      newState: { serviceAddress: updated.serviceAddress, estimatedPrice: updated.estimatedPrice },
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error("Service PATCH error:", error);
    const status = error.message?.includes("UNAUTHORIZED")
      ? 401
      : error.message?.includes("FORBIDDEN")
      ? 403
      : 400;
    return NextResponse.json({ error: error.message || "Failed to update service" }, { status });
  }
}
