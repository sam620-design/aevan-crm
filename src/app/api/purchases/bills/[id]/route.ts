import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupplierBillById } from "@/lib/services/purchase.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bill = await getSupplierBillById(user, params.id);
    return NextResponse.json({ success: true, supplierBill: bill });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch supplier bill" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}
