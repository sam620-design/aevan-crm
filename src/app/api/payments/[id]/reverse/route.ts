import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reversePayment } from "@/lib/services/payment.service";
import { reversePaymentSchema } from "@/lib/validations/payment.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = reversePaymentSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const payment = await reversePayment(user, params.id, parse.data);
    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to reverse payment" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
