import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentById } from "@/lib/services/payment.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payment = await getPaymentById(user, params.id);
    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    const isNotFound = error.message?.includes("not found");
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment details" },
      { status: isForbidden ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
