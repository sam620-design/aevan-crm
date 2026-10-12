import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyCustomerAdvance } from "@/lib/services/payment.service";
import { applyCustomerAdvanceSchema } from "@/lib/validations/payment.schema";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = applyCustomerAdvanceSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const result = await applyCustomerAdvance(user, parse.data);
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to apply customer advance" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
