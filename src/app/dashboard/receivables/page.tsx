"use client";

import { useState, useEffect } from "react";
import {
  CircleDollarSign,
  TrendingDown,
  Clock,
  AlertCircle,
  Users,
  Search,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function ReceivablesDashboardPage() {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReceivables();
  }, []);

  async function fetchReceivables(date?: string) {
    try {
      setLoading(true);
      setError(null);
      let url = "/api/receivables";
      if (date) url += `?asOfDate=${date}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setReport(data.report);
      } else {
        setError(data.error || "Failed to load receivables report");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading receivables");
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(e: React.FormEvent) {
    e.preventDefault();
    fetchReceivables(asOfDate);
  }

  const filteredInvoices = (report?.invoices || []).filter((inv: any) => {
    const term = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customerName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Accounts Receivable & Aging Analysis
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor outstanding invoices, aging buckets, customer exposure, and collection priorities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={handleDateChange} className="flex items-center gap-2">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              Update As-Of
            </button>
          </form>

          <button
            onClick={() => window.print()}
            className="p-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          Calculating receivables and aging buckets...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-xs">
          {error}
        </div>
      ) : !report ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No receivables data available.
        </div>
      ) : (
        <>
          {/* 2. Primary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Receivables
              </p>
              <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                ₹{Number(report.totals.totalReceivables).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Across {report.totals.invoiceCount} open invoices
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Advances Held
              </p>
              <p className="text-xl sm:text-2xl font-black text-indigo-700 mt-1">
                ₹{Number(report.totals.totalAdvances).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Unallocated customer credit</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Net Exposure
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                ₹{Number(report.totals.netExposure).toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Receivables minus advances</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Outstanding Accounts
              </p>
              <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
                {report.customerRankings.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Customers with open balances</p>
            </div>
          </div>

          {/* 3. Aging Buckets Analysis */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Invoice Aging Buckets (Overdue Analysis)
              </h2>
              <span className="text-xs text-slate-400">
                As of: {new Date(report.asOfDate).toLocaleDateString("en-IN")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Current / Not Due</span>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-1">
                  ₹{Number(report.aging.current).toLocaleString("en-IN")}
                </p>
                <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
                  <div
                    className="bg-emerald-600 h-1 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (report.aging.current / (report.totals.totalReceivables || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">1–30 Days</span>
                <p className="text-base sm:text-lg font-black text-amber-700 mt-1">
                  ₹{Number(report.aging.days1_30).toLocaleString("en-IN")}
                </p>
                <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
                  <div
                    className="bg-amber-500 h-1 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (report.aging.days1_30 / (report.totals.totalReceivables || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">31–60 Days</span>
                <p className="text-base sm:text-lg font-black text-orange-700 mt-1">
                  ₹{Number(report.aging.days31_60).toLocaleString("en-IN")}
                </p>
                <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
                  <div
                    className="bg-orange-500 h-1 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (report.aging.days31_60 / (report.totals.totalReceivables || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">61–90 Days</span>
                <p className="text-base sm:text-lg font-black text-rose-700 mt-1">
                  ₹{Number(report.aging.days61_90).toLocaleString("en-IN")}
                </p>
                <div className="w-full bg-slate-200 h-1 rounded-full mt-2">
                  <div
                    className="bg-rose-500 h-1 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (report.aging.days61_90 / (report.totals.totalReceivables || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-rose-50/50 p-3 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase">90+ Days Overdue</span>
                <p className="text-base sm:text-lg font-black text-rose-800 mt-1">
                  ₹{Number(report.aging.days90Plus).toLocaleString("en-IN")}
                </p>
                <div className="w-full bg-rose-200 h-1 rounded-full mt-2">
                  <div
                    className="bg-rose-700 h-1 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (report.aging.days90Plus / (report.totals.totalReceivables || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Customer Ranking Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Customer Outstanding Exposure Ranking
              </h2>
              <span className="text-xs text-slate-400">
                {report.customerRankings.length} accounts ranked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4 text-center">Open Invoices</th>
                    <th className="py-3 px-4 text-right">Total Outstanding</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.customerRankings.map((c: any, index: number) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        #{index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-xs">
                          {c.count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        ₹{Number(c.outstanding).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/dashboard/ledger?customerId=${c.id}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <span>Ledger</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Invoices List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Outstanding Invoices ({filteredInvoices.length})
              </h2>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter invoices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Invoice Date</th>
                    <th className="py-3 px-4 text-right">Invoice Total</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {inv.customerName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {new Date(inv.saleDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">
                        ₹{Number(inv.grandTotal).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600">
                        ₹{Number(inv.balanceAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href="/dashboard/payments"
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                        >
                          Collect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
