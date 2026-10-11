"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Printer,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export default function QuotationsPage() {
  const [search, setSearch] = useState("");

  const quotations = [
    {
      id: "QTN-1001",
      customer: "Hotel Nalanda Residency",
      date: "11 Oct 2026",
      validUntil: "25 Oct 2026",
      total: "₹42,500",
      status: "SENT",
      items: "Commercial Tank Cleaning + 20x Floor Cleaner 5L",
    },
    {
      id: "QTN-1002",
      customer: "Rajgir Heritage Resort",
      date: "05 Oct 2026",
      validUntil: "15 Oct 2026",
      total: "₹78,000",
      status: "ACCEPTED",
      items: "Deep Cleaning Contract & Disinfectant Supplies",
    },
    {
      id: "QTN-1003",
      customer: "Sunrise Public School",
      date: "20 Sep 2026",
      validUntil: "05 Oct 2026",
      total: "₹18,500",
      status: "EXPIRED",
      items: "Restroom Sanitization + Toilet Cleaner Bulk",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Quotations & Estimates
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Generate quotes, track validity, and convert directly to Sales.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quotation number or client..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {quotations.map((q) => (
          <div
            key={q.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {q.id}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{q.customer}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{q.items}</p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  q.status === "ACCEPTED"
                    ? "bg-emerald-100 text-emerald-800"
                    : q.status === "SENT"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {q.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px]">Estimate Value: </span>
                <span className="font-bold text-slate-900">{q.total}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Valid Until: </span>
                <span className="font-medium text-slate-700">{q.validUntil}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => alert(`Printing Quotation ${q.id}...`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>

              {q.status === "ACCEPTED" ? (
                <button
                  onClick={() => alert(`Converting Quotation ${q.id} into a direct Sale!`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <span>Convert to Sale</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-xs text-slate-400">Created: {q.date}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
