"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  BookOpen,
  AlertCircle,
  Printer,
  ChevronRight,
} from "lucide-react";

interface AgingSupplier {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  phone: string;
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  totalBalance: number;
  unpaidBills: Array<{
    id: string;
    billNumber: string;
    supplierInvoiceNumber: string;
    billDate: string;
    dueDate?: string | null;
    grandTotal: number;
    balanceAmount: number;
    daysOverdue: number;
  }>;
}

interface AccountsPayableReport {
  summary: {
    current: number;
    days1To30: number;
    days31To60: number;
    days61To90: number;
    days90Plus: number;
    totalPayable: number;
  };
  suppliers: AgingSupplier[];
}

export default function AccountsPayablePage() {
  const [report, setReport] = useState<AccountsPayableReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [asOfDate]);

  async function fetchReport() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (asOfDate) params.set("asOfDate", asOfDate);

      const res = await fetch(`/api/accounts-payable?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        setError(data.error || "Failed to load accounts payable report");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Accounts Payable & Aging</h1>
            <p className="text-xs text-slate-500">
              Vendor debts categorized by overdue maturity buckets & cash flow planning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-700"
            title="As of date"
          />
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Aging Metric Cards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-slate-500">Current (Not Due)</span>
            <p className="text-base font-bold text-slate-800 mt-1">
              ₹{report.summary.current.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-blue-600">1 - 30 Days</span>
            <p className="text-base font-bold text-blue-700 mt-1">
              ₹{report.summary.days1To30.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-amber-600">31 - 60 Days</span>
            <p className="text-base font-bold text-amber-700 mt-1">
              ₹{report.summary.days31To60.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-orange-600">61 - 90 Days</span>
            <p className="text-base font-bold text-orange-700 mt-1">
              ₹{report.summary.days61To90.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-medium text-red-600">90+ Days</span>
            <p className="text-base font-bold text-red-700 mt-1">
              ₹{report.summary.days90Plus.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-brand-300 shadow-sm bg-brand-50/30">
            <span className="text-[11px] font-bold text-brand-900">Total Payable</span>
            <p className="text-base font-bold text-brand-800 mt-1">
              ₹{report.summary.totalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Supplier Breakdown */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading accounts payable report...</div>
      ) : !report || report.suppliers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">Zero accounts payable</h3>
          <p className="text-xs text-slate-500">All supplier bills are completely settled.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {report.suppliers.map((s) => (
            <div
              key={s.supplierId}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200 uppercase">
                      {s.supplierCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{s.supplierName}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Phone: {s.phone}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right sm:mr-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Total Due
                    </span>
                    <p className="text-base font-bold text-red-700">
                      ₹{s.totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/supplier-payments?supplierId=${s.supplierId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-800 text-white rounded-xl text-xs font-semibold hover:bg-brand-900 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Vendor</span>
                  </Link>

                  <Link
                    href={`/dashboard/supplier-ledger?supplierId=${s.supplierId}`}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                    title="View Ledger"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Aging breakdown for this supplier */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400">Current</span>
                  <p className="font-semibold text-slate-800">₹{s.current.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-blue-600">1-30d</span>
                  <p className="font-semibold text-blue-700">₹{s.days1To30.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-amber-600">31-60d</span>
                  <p className="font-semibold text-amber-700">₹{s.days31To60.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-orange-600">61-90d</span>
                  <p className="font-semibold text-orange-700">₹{s.days61To90.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-red-600">90d+</span>
                  <p className="font-semibold text-red-700">₹{s.days90Plus.toFixed(2)}</p>
                </div>
              </div>

              {/* Unpaid bills list */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase">
                  Unpaid Invoices ({s.unpaidBills.length})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {s.unpaidBills.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 text-xs flex justify-between items-center bg-white"
                    >
                      <div>
                        <span className="font-mono font-medium text-slate-900">{b.billNumber}</span>
                        <span className="text-[11px] text-slate-500 ml-2">
                          (Inv: {b.supplierInvoiceNumber})
                        </span>
                        {b.daysOverdue > 0 && (
                          <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                            {b.daysOverdue} days overdue
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">
                          ₹{b.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
