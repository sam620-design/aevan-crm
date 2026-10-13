import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createCleaningService,
  getCleaningServices,
} from "@/lib/services/cleaning-service.service";
import { createCleaningServiceSchema } from "@/lib/validations/service.schema";
import { ServiceStatus, ServiceCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ServiceStatus | undefined;
    const category = searchParams.get("category") as ServiceCategory | undefined;
    const staffId = searchParams.get("staffId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    const data = await getCleaningServices(user, {
      status,
      category,
      staffId,
      customerId,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Services GET error:", error);
    const status = error.message?.includes("UNAUTHORIZED")
      ? 401
      : error.message?.includes("FORBIDDEN")
      ? 403
      : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch services" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCleaningServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const service = await createCleaningService(user, parsed.data as any);
    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error: any) {
    console.error("Services POST error:", error);
    const status = error.message?.includes("UNAUTHORIZED")
      ? 401
      : error.message?.includes("FORBIDDEN")
      ? 403
      : 400;
    return NextResponse.json({ error: error.message || "Failed to create service" }, { status });
  }
}
