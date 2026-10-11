"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  Printer,
  ShieldCheck,
} from "lucide-react";

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  const payments = [
    {
      ref: "PAY-1001",
      customer: "Patna Central Cleaning Supplies",
      method: "BANK_TRANSFER",
      amount: "₹68,000",
      date: "10 Oct 2026",
      status: "VERIFIED",
      verifiedBy: "Superadmin",
      allocatedTo: "INV-1001",
    },
    {
      ref: "PAY-1002",
      customer: "Rajesh Hardware & Sanitation",
      method: "UPI",
      amount: "₹20,000",
      date: "09 Oct 2026",
      status: "VERIFIED",
      verifiedBy: "Superadmin",
      allocatedTo: "INV-1002",
    },
    {
      ref: "PAY-1003",
      customer: "Silao Modern Hospital",
      method: "CHEQUE",
      amount: "₹22,800",
      date: "11 Oct 2026",
      status: "PENDING_VERIFICATION",
      verifiedBy: null,
      allocatedTo: "INV-1003",
    },
  ];

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.ref.toLowerCase().includes(search.toLowerCase()) ||
      p.customer.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "ALL" || p.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Payment Register
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Payment records, verification workflows, and invoice allocations.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Verification Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <p>
          <strong>Two-Phase Verification Rule:</strong> Payments with <em>Pending Verification</em> remain distinct and are not treated as confirmed money received until an authorized verifier confirms bank credit.
        </p>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment reference (PAY-...) or customer name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <div className="flex gap-2 text-xs">
          {["ALL", "VERIFIED", "PENDING_VERIFICATION"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab === "PENDING_VERIFICATION" ? "Pending Verification" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Cards */}
      <div className="space-y-3">
        {filtered.map((p) => (
          <div
            key={p.ref}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                  {p.ref}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{p.customer}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Method: <span className="font-medium text-slate-700">{p.method}</span> • Allocated: {p.allocatedTo}
                </p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.status === "VERIFIED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {p.status === "VERIFIED" ? "Verified" : "Pending Verification"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px]">Payment Amount: </span>
                <span className="font-bold text-slate-900 text-sm">{p.amount}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Date: </span>
                <span className="font-medium text-slate-700">{p.date}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                {p.verifiedBy ? `Verified by ${p.verifiedBy}` : "Awaiting verification"}
              </span>

              <div className="flex items-center gap-2">
                {p.status === "PENDING_VERIFICATION" && (
                  <button
                    onClick={() => alert(`Authorizing & verifying payment ${p.ref}...`)}
                    className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Verify & Confirm
                  </button>
                )}
                <button
                  onClick={() => alert(`Printing receipt for ${p.ref}...`)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                  title="Print Receipt"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
