import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOutwardById, updateOutwardDraft } from "@/lib/services/outward.service";
import { updateOutwardSchema } from "@/lib/validations/outward.schema";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const outward = await getOutwardById(user, params.id);
    return NextResponse.json({ outward });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch outward entry" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = updateOutwardSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const updated = await updateOutwardDraft(user, params.id, parse.data);
    return NextResponse.json({ success: true, outward: updated });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update outward entry" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
