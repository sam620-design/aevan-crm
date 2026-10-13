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

    // Standardize summary
    const summary = {
      current: report.summary?.current ?? report.aging?.current ?? 0,
      days1To30: report.summary?.days1To30 ?? report.aging?.days1_30 ?? 0,
      days31To60: report.summary?.days31To60 ?? report.aging?.days31_60 ?? 0,
      days61To90: report.summary?.days61To90 ?? report.aging?.days61_90 ?? 0,
      days90Plus: report.summary?.days90Plus ?? report.aging?.days90Plus ?? 0,
      totalPayable: report.summary?.totalPayable ?? report.totals?.totalPayables ?? 0,
    };

    // Group bills by supplier
    const supplierMap = new Map<string, any>();
    for (const s of report.supplierRankings || []) {
      supplierMap.set(s.id, {
        supplierId: s.id,
        supplierCode: s.supplierCode,
        supplierName: s.name,
        phone: "",
        current: 0,
        days1To30: 0,
        days31To60: 0,
        days61To90: 0,
        days90Plus: 0,
        totalBalance: s.payableBalance || 0,
        unpaidBills: [],
      });
    }

    const asOf = asOfDate ? new Date(asOfDate) : new Date();

    for (const b of report.bills || []) {
      let entry = supplierMap.get(b.supplierId);
      if (!entry) {
        entry = {
          supplierId: b.supplierId,
          supplierCode: b.supplierCode || "SUPP",
          supplierName: b.supplierName,
          phone: "",
          current: 0,
          days1To30: 0,
          days31To60: 0,
          days61To90: 0,
          days90Plus: 0,
          totalBalance: 0,
          unpaidBills: [],
        };
        supplierMap.set(b.supplierId, entry);
      }

      const bal = Number(b.balanceAmount || 0);
      const effectiveDueDate = b.dueDate
        ? new Date(b.dueDate)
        : new Date(new Date(b.billDate).getTime() + 30 * 24 * 60 * 60 * 1000);
      const diffMs = asOf.getTime() - effectiveDueDate.getTime();
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) entry.current += bal;
      else if (daysOverdue <= 30) entry.days1To30 += bal;
      else if (daysOverdue <= 60) entry.days31To60 += bal;
      else if (daysOverdue <= 90) entry.days61To90 += bal;
      else entry.days90Plus += bal;

      entry.unpaidBills.push({
        id: b.id,
        billNumber: b.billNumber,
        supplierInvoiceNumber: b.supplierInvoiceNumber,
        billDate: b.billDate,
        dueDate: b.dueDate,
        grandTotal: b.grandTotal,
        balanceAmount: bal,
        daysOverdue: Math.max(0, daysOverdue),
      });
    }

    const suppliersList = Array.from(supplierMap.values());

    return NextResponse.json({
      success: true,
      ...report,
      summary,
      suppliers: suppliersList,
    });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts payable report" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
