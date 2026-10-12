import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAccountsPayableReport } from "@/lib/services/purchase.service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId") || undefined;
    const asOfDate = searchParams.get("asOfDate") || undefined;

    const report = await getAccountsPayableReport(user, { supplierId, asOfDate });
    return NextResponse.json({ success: true, ...report });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts payable report" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
