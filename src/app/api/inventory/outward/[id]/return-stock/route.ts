import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { processReturnToStock } from "@/lib/services/outward.service";
import { returnStockAcceptanceSchema } from "@/lib/validations/outward.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = returnStockAcceptanceSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const result = await processReturnToStock(user, params.id, parse.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to process stock return" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
