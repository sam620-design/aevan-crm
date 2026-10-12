import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reopenOutward } from "@/lib/services/outward.service";
import { reopenOutwardSchema } from "@/lib/validations/outward.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = reopenOutwardSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const result = await reopenOutward(user, params.id, parse.data);
    return NextResponse.json({ success: true, outward: result });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to reopen outward entry" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
