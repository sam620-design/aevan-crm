import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { closeOutward } from "@/lib/services/outward.service";
import { closeOutwardSchema } from "@/lib/validations/outward.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let data;
    try {
      const body = await request.json();
      const parse = closeOutwardSchema.safeParse(body);
      if (parse.success) data = parse.data;
    } catch {
      // Body is optional
    }

    const result = await closeOutward(user, params.id, data);
    return NextResponse.json({ success: true, outward: result });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to close outward entry" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
