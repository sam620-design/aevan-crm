"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Search,
  Filter,
  Calendar,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

interface LedgerEntry {
  id: string;
  entryDate: string;
  entryType: string;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface SupplierLedgerData {
  supplier: {
    id: string;
    code: string;
    name: string;
    businessName?: string | null;
    phone: string;
    gstin?: string | null;
  };
  summary: {
    totalCredits: number;
    totalDebits: number;
    closingBalance: number;
  };
  entries: LedgerEntry[];
}

export default function SupplierLedgerPage() {
  const searchParams = useSearchParams();
  const prefillSupplierId = searchParams.get("supplierId");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(prefillSupplierId || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ledgerData, setLedgerData] = useState<SupplierLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      fetchLedger();
    }
  }, [selectedSupplierId, startDate, endDate]);

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (res.ok) {
        setSuppliers(data.suppliers || []);
        if (!selectedSupplierId && data.suppliers?.length > 0) {
          setSelectedSupplierId(data.suppliers[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load suppliers", e);
    }
  }

  async function fetchLedger() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/suppliers/${selectedSupplierId}/ledger?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLedgerData(data);
      } else {
        setError(data.error || "Failed to load supplier ledger");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const getEntryBadge = (type: string) => {
    switch (type) {
      case "BILL":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PAYMENT":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "RETURN":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "REVERSAL":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Supplier Ledger & Statements</h1>
            <p className="text-xs text-slate-500">
              Chronological running balance statements & vendor payables reconciliation
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Supplier & Date Selection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Vendor</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      {ledgerData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Total Billed / Invoiced (Credits)</span>
            <p className="text-xl font-bold text-blue-700 mt-1">
              ₹{ledgerData.summary.totalCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Increases liability to vendor</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Total Paid & Returned (Debits)</span>
            <p className="text-xl font-bold text-emerald-700 mt-1">
              ₹{ledgerData.summary.totalDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Disbursements & returned goods</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Current Outstanding Balance</span>
            <p
              className={`text-xl font-bold mt-1 ${
                ledgerData.summary.closingBalance > 0
                  ? "text-red-700"
                  : ledgerData.summary.closingBalance < 0
                  ? "text-amber-600"
                  : "text-slate-700"
              }`}
            >
              ₹{ledgerData.summary.closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {ledgerData.summary.closingBalance > 0
                ? "Net payable amount owed to vendor"
                : ledgerData.summary.closingBalance < 0
                ? "Advance balance held with vendor"
                : "Account fully settled"}
            </p>
          </div>
        </div>
      )}

      {/* Statement Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading vendor ledger entries...</div>
      ) : !ledgerData || ledgerData.entries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No ledger transactions found</h3>
          <p className="text-xs text-slate-500">
            No bills, payments, or returns found for this vendor in the selected period.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Chronological Ledger Statement
            </h3>
            <span className="text-xs text-slate-500">
              {ledgerData.entries.length} Transaction(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Debit (₹)</th>
                  <th className="p-3 text-right">Credit (₹)</th>
                  <th className="p-3 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {new Date(entry.entryDate).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEntryBadge(
                          entry.entryType
                        )}`}
                      >
                        {entry.entryType}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {entry.referenceNumber}
                    </td>
                    <td className="p-3 text-slate-700 max-w-xs truncate">{entry.description}</td>
                    <td className="p-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                      {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-medium text-blue-700 whitespace-nowrap">
                      {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{entry.runningBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
