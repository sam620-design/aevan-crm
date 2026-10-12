"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Printer,
  Calendar,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from "lucide-react";

export default function CustomerLedgerPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      if (res.ok && data.items?.length > 0) {
        setCustomers(data.items);
        setSelectedCustomerId(data.items[0].id);
        fetchLedger(data.items[0].id, startDate, endDate);
      }
    } catch (err) {
      console.error("Error fetching customers", err);
    }
  }

  async function fetchLedger(customerId: string, start?: string, end?: string) {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);
      let url = `/api/customers/${customerId}/ledger`;
      const params = new URLSearchParams();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLedgerData(data.ledger);
      } else {
        setError(data.error || "Failed to load customer ledger");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading ledger");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCustomerId) {
      fetchLedger(selectedCustomerId, startDate, endDate);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-700" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Customer Financial Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable statement of invoices, payments, reversals, and running balances.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export Statement</span>
        </button>
      </div>

      {/* 2. Customer & Date Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                fetchLedger(e.target.value, startDate, endDate);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customerCode}) - Advance: ₹{Number(c.advanceBalance || 0)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold self-end"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* 3. Summary Cards */}
      {ledgerData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-600 mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Total Debits</p>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900">
              ₹{Number(ledgerData.summary.totalDebits).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Invoices & charges</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <ArrowDownLeft className="w-4 h-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Total Credits</p>
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900">
              ₹{Number(ledgerData.summary.totalCredits).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Payments & deposits</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Outstanding</p>
            <p className={`text-lg sm:text-xl font-black mt-1 ${
              Number(ledgerData.summary.closingBalance) > 0 ? "text-rose-700" : "text-emerald-700"
            }`}>
              ₹{Number(ledgerData.summary.closingBalance).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {Number(ledgerData.summary.closingBalance) > 0 ? "Customer owes company" : "Net settled"}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Advance Credit</p>
            <p className="text-lg sm:text-xl font-black text-indigo-700 mt-1">
              ₹{Number(ledgerData.summary.currentAdvanceBalance).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-indigo-400 mt-0.5">Unallocated advance held</p>
          </div>
        </div>
      )}

      {/* 4. Ledger Statement Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          Loading statement entries...
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-xs">
          {error}
        </div>
      ) : !ledgerData || ledgerData.entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No transactions found for the selected customer and period.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Debit (₹)</th>
                  <th className="py-3 px-4 text-right">Credit (₹)</th>
                  <th className="py-3 px-4 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.entries.map((entry: any) => {
                  const isDebit = Number(entry.debit) > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDebit
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {entry.entryType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {entry.referenceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-700">
                        {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                        {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        ₹{Number(entry.balance).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
