import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelPurchaseOrder } from "@/lib/services/purchase.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Cancelled by user";

    const po = await cancelPurchaseOrder(user, params.id, reason);
    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to cancel purchase order" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
