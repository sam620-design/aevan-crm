import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPurchaseOrderById } from "@/lib/services/purchase.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const po = await getPurchaseOrderById(user, params.id);
    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase order" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}
