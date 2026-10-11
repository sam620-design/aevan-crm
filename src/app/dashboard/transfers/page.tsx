"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
} from "lucide-react";

export default function StockTransfersPage() {
  const [search, setSearch] = useState("");

  const transfers = [
    {
      id: "TRF-1001",
      product: "GOOD TOUCH White Phenyl 5L",
      quantity: "60 Cans",
      source: "Main Facility Warehouse (LOC-MAIN-01)",
      destination: "Patna Distribution Depot (LOC-PATNA-01)",
      status: "COMPLETED",
      sender: "Rahul Kumar (Staff)",
      date: "10 Oct 2026",
    },
    {
      id: "TRF-1002",
      product: "GOOD TOUCH Power Toilet Cleaner 1L",
      quantity: "120 Bottles",
      source: "Main Facility Warehouse (LOC-MAIN-01)",
      destination: "Rajgir Branch Point (LOC-RAJGIR-01)",
      status: "DISPATCHED",
      sender: "Priya Sharma (Admin)",
      date: "11 Oct 2026",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Multi-Location Stock Transfers
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Atomic transfer ledger between warehouses and distribution points.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transfer number (TRF-...) or product..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {transfers.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {t.id}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{t.product}</h3>
                <p className="text-xs font-bold text-brand-800 mt-0.5">Quantity: {t.quantity}</p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {t.status}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-semibold text-slate-500 text-[10px] uppercase">From:</span>
                <span className="font-medium truncate">{t.source}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-semibold text-slate-500 text-[10px] uppercase">To:</span>
                <span className="font-medium truncate">{t.destination}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">
                Dispatched by: <span className="text-slate-700 font-medium">{t.sender}</span> • {t.date}
              </span>

              <button className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                Audit Record &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
