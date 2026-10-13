import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateServiceStatus } from "@/lib/services/cleaning-service.service";
import { updateServiceStatusSchema } from "@/lib/validations/service.schema";

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
    const parsed = updateServiceStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await updateServiceStatus(user, params.id, parsed.data);
    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error("Service status POST error:", error);
    const status = error.message?.includes("UNAUTHORIZED")
      ? 401
      : error.message?.includes("FORBIDDEN")
      ? 403
      : error.message?.includes("INVALID_TRANSITION")
      ? 422
      : 400;
    return NextResponse.json({ error: error.message || "Failed to update service status" }, { status });
  }
}
