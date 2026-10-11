"use client";

import { useState } from "react";
import {
  Package,
  Search,
  Plus,
  ArrowDownToLine,
  Building2,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("LOC-MAIN-01");

  const stockItems = [
    {
      sku: "GT-WP-5L",
      name: "GOOD TOUCH White Phenyl (5 Liters)",
      category: "Formulations",
      location: "Main Facility Warehouse (LOC-MAIN-01)",
      available: 180,
      minAlert: 25,
      unit: "Cans",
    },
    {
      sku: "GT-FC-5L",
      name: "GOOD TOUCH Pine Floor Cleaner (5L)",
      category: "Formulations",
      location: "Main Facility Warehouse (LOC-MAIN-01)",
      available: 120,
      minAlert: 20,
      unit: "Cans",
    },
    {
      sku: "GT-TC-1L",
      name: "GOOD TOUCH Power Toilet Cleaner (1L)",
      category: "Sanitary Gel",
      location: "Main Facility Warehouse (LOC-MAIN-01)",
      available: 340,
      minAlert: 50,
      unit: "Bottles",
    },
    {
      sku: "GT-DW-1L",
      name: "GOOD TOUCH Lemon Dish Wash Gel (1L)",
      category: "Dishcare",
      location: "Main Facility Warehouse (LOC-MAIN-01)",
      available: 85,
      minAlert: 30,
      unit: "Bottles",
    },
    {
      sku: "GT-AC-500M",
      name: "GOOD TOUCH High Purity Acid (500ml)",
      category: "Heavy Duty",
      location: "Main Facility Warehouse (LOC-MAIN-01)",
      available: 15,
      minAlert: 20,
      unit: "Bottles",
      isLow: true,
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Inventory & Stock Balances
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Real-time physical stock tracking by product SKU and facility location.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
            <ArrowDownToLine className="w-4 h-4" />
            <span>Stock Inward</span>
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow transition-colors">
            <Plus className="w-4 h-4" />
            <span>New SKU</span>
          </button>
        </div>
      </div>

      {/* Negative Stock Lock Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <strong>Negative-Stock Override Policy:</strong> Strictly disabled by default. System transactions reject any dispatch attempt exceeding physical available balance.
        </p>
      </div>

      {/* Location Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or formulation name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-600 shadow-sm"
          >
            <option value="LOC-MAIN-01">Main Facility Warehouse (LOC-MAIN-01)</option>
            <option value="LOC-PATNA-01">Patna Depot (LOC-PATNA-01)</option>
          </select>
        </div>
      </div>

      {/* Stock Cards */}
      <div className="space-y-3">
        {stockItems.map((item) => (
          <div
            key={item.sku}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {item.sku}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{item.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
              </div>

              {item.isLow ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Low Stock Alert</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Normal Stock
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px]">Available Stock: </span>
                <span className="text-base font-black text-slate-900">
                  {item.available} {item.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Min Alert Level: </span>
                <span className="font-medium text-slate-700">{item.minAlert} {item.unit}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{item.location}</span>
              </span>

              <button className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                Movement Ledger &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
