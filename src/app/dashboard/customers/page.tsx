"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageSquare,
  Building2,
  Tag,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  const customers = [
    {
      code: "CUST-1001",
      name: "Rajesh Hardware & Sanitation",
      contact: "+91 98350 12345",
      type: "DISTRIBUTOR",
      tier: "Super Stockist (₹5 Lakhs)",
      city: "Bihar Sharif",
      outstanding: "₹45,000",
      ordersCount: 14,
    },
    {
      code: "CUST-1002",
      name: "Patna Central Cleaning Supplies",
      contact: "+91 94310 98765",
      type: "DISTRIBUTOR",
      tier: "State Level (₹7 Lakhs)",
      city: "Patna",
      outstanding: "₹0",
      ordersCount: 22,
    },
    {
      code: "CUST-1003",
      name: "Nalanda Deep Clean Services",
      contact: "+91 70611 22334",
      type: "WHOLESALE",
      tier: "Wholesale Rate Card",
      city: "Rajgir",
      outstanding: "₹12,400",
      ordersCount: 6,
    },
    {
      code: "CUST-1004",
      name: "Dr. Alok Verma (Clinic)",
      contact: "+91 82100 55667",
      type: "CORPORATE",
      tier: "Institutional Contract",
      city: "Silao",
      outstanding: "₹0",
      ordersCount: 3,
    },
  ];

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "ALL" || c.type === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Customer Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Clients, stockists, and corporate accounts with price tiers.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone number, or CUST code..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {["ALL", "DISTRIBUTOR", "WHOLESALE", "CORPORATE", "RETAIL"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                activeTab === tab
                  ? "bg-brand-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Mobile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((c) => (
          <div
            key={c.code}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {c.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{c.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{c.city}</span>
                </p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  c.type === "DISTRIBUTOR"
                    ? "bg-emerald-100 text-emerald-800"
                    : c.type === "CORPORATE"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {c.tier}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px]">Due Balance: </span>
                <span className="font-bold text-slate-800">{c.outstanding}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Total Orders: </span>
                <span className="font-semibold text-slate-700">{c.ordersCount}</span>
              </div>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${c.contact}`}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                  title="Call Customer"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/${c.contact.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
              </div>

              <button className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800">
                <span>View Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
