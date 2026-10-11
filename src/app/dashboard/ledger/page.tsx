"use client";

import { useState } from "react";
import {
  BookOpen,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Printer,
  Calendar,
} from "lucide-react";

export default function CustomerLedgerPage() {
  const [selectedCustomer, setSelectedCustomer] = useState("Rajesh Hardware & Sanitation");

  const ledgerEntries = [
    {
      id: "LED-001",
      date: "09 Oct 2026",
      type: "SALE_INVOICE",
      ref: "INV-1002",
      description: "Direct Sale - GOOD TOUCH Formulations",
      debit: "₹45,000",
      credit: "₹0",
      runningBalance: "₹45,000",
    },
    {
      id: "LED-002",
      date: "09 Oct 2026",
      type: "PAYMENT_RECEIPT",
      ref: "PAY-1002",
      description: "UPI Settlement via PhonePe",
      debit: "₹0",
      credit: "₹20,000",
      runningBalance: "₹25,000",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Customer Financial Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Immutable statement of sales, receipts, credit notes, and running balance.
          </p>
        </div>

        <button
          onClick={() => alert("Generating printable customer statement PDF...")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Export Ledger Statement</span>
        </button>
      </div>

      {/* Customer Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Viewing Ledger Statement For
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-600"
          >
            <option value="Rajesh Hardware & Sanitation">Rajesh Hardware & Sanitation (CUST-1001)</option>
            <option value="Patna Central Cleaning Supplies">Patna Central Cleaning Supplies (CUST-1002)</option>
            <option value="Nalanda Deep Clean Services">Nalanda Deep Clean Services (CUST-1003)</option>
          </select>
        </div>

        <div className="sm:text-right">
          <p className="text-[11px] text-slate-500 uppercase font-semibold">Net Outstanding Balance</p>
          <p className="text-xl font-black text-red-600">₹25,000</p>
        </div>
      </div>

      {/* Ledger Entries List */}
      <div className="space-y-3">
        {ledgerEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    entry.debit !== "₹0"
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {entry.debit !== "₹0" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {entry.description}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ref: <span className="font-mono font-semibold text-slate-700">{entry.ref}</span> • {entry.date}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  entry.debit !== "₹0"
                    ? "bg-red-100 text-red-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {entry.type === "SALE_INVOICE" ? "INVOICE (+)" : "PAYMENT (-)"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs text-center">
              <div>
                <p className="text-slate-400 text-[10px]">Debit (Charges)</p>
                <p className="font-bold text-red-600">{entry.debit}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Credit (Paid)</p>
                <p className="font-bold text-emerald-600">{entry.credit}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Running Balance</p>
                <p className="font-bold text-slate-900">{entry.runningBalance}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
