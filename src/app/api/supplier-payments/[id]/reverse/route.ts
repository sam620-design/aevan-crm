import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reverseSupplierPayment } from "@/lib/services/purchase.service";
import { reverseSupplierPaymentSchema } from "@/lib/validations/purchase.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = reverseSupplierPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const payment = await reverseSupplierPayment(user, params.id, parsed.data.reason);
    return NextResponse.json({ success: true, supplierPayment: payment });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to reverse supplier payment" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
