"use client";

import { useState } from "react";
import {
  PackageMinus,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";

export default function InventoryOutwardPage() {
  const [search, setSearch] = useState("");

  const outwardEntries = [
    {
      id: "OUT-1001",
      product: "GOOD TOUCH White Phenyl 5L (50 Cans)",
      taker: "Suresh (Field Dispatch Driver)",
      date: "11 Oct 2026, 09:30 AM",
      purpose: "Delivery for Patna Central Wholesale order (Free text)",
      responsible: "Rahul Kumar (Staff)",
      reconciliation: "RECONCILED",
      disposition: "50x Sold (Linked to INV-1001)",
      hasDiscrepancy: false,
    },
    {
      id: "OUT-1002",
      product: "GOOD TOUCH Pine Floor Cleaner 5L (20 Cans)",
      taker: "Manoj (Cleaning Service Technician)",
      date: "10 Oct 2026, 02:00 PM",
      purpose: "Site cleaning job at Nalanda Residency hotel",
      responsible: "Rahul Kumar (Staff)",
      reconciliation: "PENDING",
      disposition: "12x Used on-site, 8x Pending Return to Stock",
      hasDiscrepancy: false,
    },
    {
      id: "OUT-1003",
      product: "GOOD TOUCH Toilet Cleaner 1L (30 Bottles)",
      taker: "Amit (Van Driver)",
      date: "09 Oct 2026, 11:15 AM",
      purpose: "Transport to Silao Retail counters",
      responsible: "Priya Sharma (Admin)",
      reconciliation: "DISCREPANCY",
      disposition: "26x Sold, 2x Damaged in transit, 2x Missing",
      hasDiscrepancy: true,
      discrepancyReason: "Box leaked during rough road transit in Silao. Pending Superadmin authorization.",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PackageMinus className="w-5 h-5 text-amber-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Inventory Outward (Physical Movement)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Records products physically taken out with multi-disposition reconciliation.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Outward Entry</span>
        </button>
      </div>

      {/* Zero Double-Deduction & Reconciliation Policy Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-amber-950">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          <span>Core Inventory Guarantees:</span>
        </p>
        <p>
          • <strong>Zero Double-Deduction:</strong> Stock is physically deducted at Outward entry. Linking outward quantity to a Sale record never deducts stock twice.
        </p>
        <p>
          • <strong>Mandatory Reconciliation:</strong> Every entry must account for 100% of outward quantity (Sold, Transferred, Returned, Used, Damaged). Discrepancies require Superadmin-approved sign-off before closure.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by OUT reference, taker name, or product..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
        />
      </div>

      {/* Outward Cards */}
      <div className="space-y-3">
        {outwardEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  {entry.id}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{entry.product}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Taken by: <span className="font-medium text-slate-800">{entry.taker}</span> • {entry.date}
                </p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  entry.reconciliation === "RECONCILED"
                    ? "bg-emerald-100 text-emerald-800"
                    : entry.reconciliation === "DISCREPANCY"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {entry.reconciliation}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="text-slate-500">
                <span className="font-semibold text-slate-700">Manually Entered Purpose: </span>
                {entry.purpose}
              </p>
              <p className="text-slate-500">
                <span className="font-semibold text-slate-700">Disposition Breakdown: </span>
                <span className="font-medium text-slate-800">{entry.disposition}</span>
              </p>
            </div>

            {entry.hasDiscrepancy && (
              <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pending Discrepancy Approval:</p>
                  <p className="mt-0.5">{entry.discrepancyReason}</p>
                  <button
                    onClick={() => alert(`Reviewing & authorizing discrepancy for ${entry.id}...`)}
                    className="mt-2 px-3 py-1 bg-red-800 text-white rounded-lg text-[11px] font-semibold"
                  >
                    Authorize Discrepancy (Superadmin)
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-400">Responsible: {entry.responsible}</span>

              {entry.reconciliation === "PENDING" && (
                <button
                  onClick={() => alert(`Opening reconciliation modal for ${entry.id}...`)}
                  className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Reconcile Quantities
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
