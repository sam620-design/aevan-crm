"use client";

import { useState } from "react";
import {
  Receipt,
  Search,
  Plus,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

export default function SalesPage() {
  const [search, setSearch] = useState("");

  const sales = [
    {
      invoice: "INV-1001",
      customer: "Patna Central Cleaning Supplies",
      date: "10 Oct 2026",
      origin: "Converted from ORD-1002",
      total: "₹68,000",
      paid: "₹68,000",
      balance: "₹0",
      paymentStatus: "PAID",
      approval: "AUTO_APPROVED",
    },
    {
      invoice: "INV-1002",
      customer: "Rajesh Hardware & Sanitation",
      date: "09 Oct 2026",
      origin: "Direct Sale",
      total: "₹45,000",
      paid: "₹20,000",
      balance: "₹25,000",
      paymentStatus: "PARTIAL",
      approval: "APPROVED",
    },
    {
      invoice: "INV-1003",
      customer: "Silao Modern Hospital",
      date: "08 Oct 2026",
      origin: "Direct Sale (Disinfectant Formulations)",
      total: "₹22,800",
      paid: "₹0",
      balance: "₹22,800",
      paymentStatus: "UNPAID",
      approval: "AUTO_APPROVED",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Sales & Invoicing
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Finalized sales with sequential GST invoice numbering.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Direct Sale</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number (INV-...) or customer name..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
        />
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {sales.map((s) => (
          <div
            key={s.invoice}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                  {s.invoice}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{s.customer}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.origin}</p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800"
                    : s.paymentStatus === "PARTIAL"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {s.paymentStatus}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs text-center">
              <div>
                <p className="text-slate-400 text-[10px]">Grand Total</p>
                <p className="font-bold text-slate-900">{s.total}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Paid</p>
                <p className="font-semibold text-emerald-700">{s.paid}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Balance</p>
                <p className="font-bold text-red-600">{s.balance}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">{s.date}</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Printing Invoice ${s.invoice}...`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
