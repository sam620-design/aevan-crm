import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentReceiptDocument } from "@/lib/services/payment.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const receiptDoc = await getPaymentReceiptDocument(user, params.id);
    return NextResponse.json({ success: true, receipt: receiptDoc });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to generate receipt document" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
