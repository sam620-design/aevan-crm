import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupplierLedger } from "@/lib/services/purchase.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const ledger = await getSupplierLedger(user, params.id, { startDate, endDate });
    return NextResponse.json({ success: true, ...ledger, ledger });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch supplier ledger" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
