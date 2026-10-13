"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Package,
  ShieldCheck,
  Printer,
  Wallet,
  DollarSign,
  Layers,
  ArrowUpRight,
  PieChart,
} from "lucide-react";

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PROFIT" | "INVENTORY" | "BALANCE">("PROFIT");

  useEffect(() => {
    fetch("/api/reports/summary")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res);
      })
      .catch((err) => console.error("Failed to load reports:", err))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data?.metrics || {};
  const isSuper = data?.isSuperadmin;
  const marginsUnlocked = data?.marginsUnlocked;
  const skuList = data?.skuBreakdown || [];

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-700" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Financial Intelligence & Operations Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time gross margins, procurement valuations, customer receivables & vendor liabilities.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Export Audit Report</span>
        </button>
      </div>

      {/* Superadmin Full Unlocked Access Banner */}
      <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-emerald-950">
              Superadmin Intelligence Cockpit: 100% Unlocked Financial Visibility
            </h2>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              All financial ledgers, margins, revenue metrics, cost of goods, and receivables are 100% unlocked for your root account. No permissions required.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-200/80 text-emerald-900 rounded-full text-[11px] font-black shrink-0">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Root Access Active</span>
        </span>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Revenue (Invoiced)</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹{Number(metrics.totalRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.finalizedSalesCount || 0} finalized sale(s)</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">
            Gross Margin (Profit)
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
            ₹{Number(metrics.grossProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            {metrics.grossMarginPercent || "0.0"}% Gross Profit Margin
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-700 uppercase">Receivables (Customer Dues)</span>
          <p className="text-xl sm:text-2xl font-black text-blue-800 mt-1">
            ₹{Number(metrics.totalReceivables || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Outstanding on client ledgers</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Payables (Vendor Liabilities)</span>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            ₹{Number(metrics.totalPayables || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Pending supplier bills</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("PROFIT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "PROFIT"
              ? "bg-slate-900 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Product Margin & Cost Intelligence
        </button>

        <button
          onClick={() => setActiveTab("INVENTORY")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "INVENTORY"
              ? "bg-slate-900 text-white shadow"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Warehouse Stock Valuations
        </button>
      </div>

      {/* Tab 1: Product Margin & Cost Intelligence */}
      {activeTab === "PROFIT" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Formulation Cost & Profit Margin Ledger (Superadmin View)
              </h3>
              <p className="text-xs text-slate-500">
                Complete transparency into unit cost, base retail price, gross profit spread, and target margins.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg font-bold border border-emerald-200">
              Cost Data Unlocked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">SKU & Formulation</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Gross Spread</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {skuList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.sku}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{item.category}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{Number(item.basePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-800">
                      ₹{item.costPrice !== null ? Number(item.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-indigo-900">
                      +₹{item.profitPerUnit !== null ? Number(item.profitPerUnit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-700">
                      {item.marginPct ? `${item.marginPct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Warehouse Stock Valuations */}
      {activeTab === "INVENTORY" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Physical Inventory Valuation Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Asset valuation evaluated simultaneously at procurement cost vs retail distribution price.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs text-slate-500">Retail Inventory Valuation (Base Price)</span>
              <p className="text-2xl font-black text-slate-900">
                ₹{Number(metrics.inventoryRetailValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-400">Total potential realized revenue across all SKUs</p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-xs text-emerald-700 font-semibold">Procurement Cost Valuation (Unlocked)</span>
              <p className="text-2xl font-black text-emerald-800">
                ₹{Number(metrics.inventoryCostValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-700">Capital invested in physical warehouse inventory</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
