"use client";

import {
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Package,
  AlertTriangle,
  Lock,
  Printer,
  Calendar,
} from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Operational & Sales Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Permission-scoped analytics, inventory summaries, and outstanding dues.
          </p>
        </div>

        <button
          onClick={() => alert("Exporting monthly summary report...")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Export Summary</span>
        </button>
      </div>

      {/* Margin / Profit Lock Policy Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <strong>Profit & Margin Data Guard:</strong> In accordance with AEVAN Cleaning CRM security rules, product cost and margin calculations remain strictly locked and are hidden from staff and admins unless granted explicit <code>VIEW_PROFIT_MARGINS</code> permission by Superadmin.
        </p>
      </div>

      {/* Key Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Sales</p>
          <p className="text-xl font-bold text-slate-900 mt-1">₹1,35,800</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">↑ 14% vs last month</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Dues</p>
          <p className="text-xl font-bold text-red-600 mt-1">₹47,800</p>
          <p className="text-[10px] text-slate-400 mt-1">3 active balances</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Stock Outward</p>
          <p className="text-xl font-bold text-slate-900 mt-1">420 Units</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1">100% accounted</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending Audits</p>
          <p className="text-xl font-bold text-amber-600 mt-1">1 Case</p>
          <p className="text-[10px] text-slate-400 mt-1">Discrepancy in Silao</p>
        </div>
      </div>

      {/* Available Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: "Sales & Invoicing Summary",
            desc: "Total invoiced revenue, taxes collected, and customer-wise sales breakdown.",
          },
          {
            title: "Outstanding Receivables (Udhaar Ledger)",
            desc: "Customer aging report with overdue days, payment history, and pending collections.",
          },
          {
            title: "Physical Inventory Movement Report",
            desc: "Stock inward, outward movements, and balance audits across all warehouses.",
          },
          {
            title: "Outward Quantity Reconciliation Ledger",
            desc: "Complete accounting of goods taken out: Sold, Transferred, Returned, Used, Damaged.",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between"
          >
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
            <button
              onClick={() => alert(`Opening ${item.title}...`)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0 ml-3"
            >
              Generate
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
