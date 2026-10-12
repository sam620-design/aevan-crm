import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReceivablesReport } from "@/lib/services/payment.service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || undefined;
    const asOfDate = searchParams.get("asOfDate") || undefined;

    const report = await getReceivablesReport(user, { customerId, asOfDate });
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch receivables report" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
