"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";

export default function OrdersPage() {
  const [search, setSearch] = useState("");

  const orders = [
    {
      id: "ORD-1001",
      customer: "Rajesh Hardware & Sanitation",
      itemsSummary: "50x White Phenyl 5L, 25x Toilet Cleaner 1L",
      date: "11 Oct 2026",
      deliveryDate: "14 Oct 2026",
      total: "₹34,500",
      status: "CONFIRMED",
      hasSale: false,
    },
    {
      id: "ORD-1002",
      customer: "Patna Central Cleaning Supplies",
      itemsSummary: "100x Floor Cleaner 5L, 50x Black Phenyl",
      date: "10 Oct 2026",
      deliveryDate: "12 Oct 2026",
      total: "₹68,000",
      status: "COMPLETED",
      hasSale: true,
      saleInvoice: "INV-1001",
    },
    {
      id: "ORD-1003",
      customer: "Nalanda Deep Clean Services",
      itemsSummary: "20x Acid 500ml, 30x Dish Wash Gel 1L",
      date: "09 Oct 2026",
      deliveryDate: "10 Oct 2026",
      total: "₹14,200",
      status: "PENDING",
      hasSale: false,
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Customer Orders (Incoming)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Pre-sale bookings. Orders never generate invoices.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Order</span>
        </button>
      </div>

      {/* Mandatory Separation Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
        <FileCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <p>
          <strong>Orders vs Sales Rule:</strong> Creating an Order does not generate an invoice. Completed orders remain visible here and can be converted into separate Sales via the &quot;Create Sale&quot; action.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number or customer name..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
        />
      </div>

      {/* Orders List Cards */}
      <div className="space-y-3">
        {orders.map((o) => (
          <div
            key={o.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {o.id}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{o.customer}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{o.itemsSummary}</p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  o.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800"
                    : o.status === "CONFIRMED"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {o.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px]">Order Value: </span>
                <span className="font-bold text-slate-900">{o.total}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Exp Delivery: </span>
                <span className="font-medium text-slate-700">{o.deliveryDate}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {o.hasSale ? (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Linked Sale: {o.saleInvoice}</span>
                </span>
              ) : (
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
                  <span>Create Sale (Invoice)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button className="text-xs text-slate-500 hover:text-slate-900 font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
