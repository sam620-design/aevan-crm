import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assignServiceStaff } from "@/lib/services/cleaning-service.service";
import { assignServiceStaffSchema } from "@/lib/validations/service.schema";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = assignServiceStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await assignServiceStaff(
      user,
      params.id,
      parsed.data.assignedStaffId,
      parsed.data.notes
    );
    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error("Service assign POST error:", error);
    const status = error.message?.includes("UNAUTHORIZED")
      ? 401
      : error.message?.includes("FORBIDDEN")
      ? 403
      : 400;
    return NextResponse.json({ error: error.message || "Failed to assign staff" }, { status });
  }
}
