"use client";

import { useState, useEffect } from "react";
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
  RotateCcw,
  Sparkles,
  FileText,
  Building2,
  ArrowRight,
  Filter,
} from "lucide-react";

interface PaymentItem {
  id: string;
  receiptNumber: string;
  amount: number;
  unallocatedAmount: number;
  paymentMethod: string;
  receivedAt: string;
  status: string;
  referenceNumber?: string | null;
  customer: {
    id: string;
    customerCode: string;
    name: string;
    phone: string;
  };
  allocations: Array<{
    id: string;
    allocatedAmount: number;
    allocationType: string;
    sale: {
      id: string;
      invoiceNumber?: string | null;
      saleNumber: string;
      grandTotal: number;
      balanceAmount: number;
    };
  }>;
  createdBy: {
    name: string;
    role: string;
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [receiptDoc, setReceiptDoc] = useState<any | null>(null);

  // Record Form state
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [allocationMode, setAllocationMode] = useState<"MANUAL" | "OLDEST_FIRST" | "NONE">("MANUAL");
  const [acceptAdvance, setAcceptAdvance] = useState(false);
  const [manualAllocations, setManualAllocations] = useState<{ [saleId: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);

  // Reversal Form state
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, []);

  async function fetchPayments() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/payments");
      const data = await res.json();
      if (res.ok) {
        setPayments(data.items || []);
      } else {
        setError(data.error || "Failed to fetch payments");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading payments");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.items || []);
      }
    } catch (err) {
      console.error("Error loading customers", err);
    }
  }

  async function onSelectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    setManualAllocations({});
    if (!customerId) {
      setCustomerInvoices([]);
      return;
    }

    try {
      // Fetch finalized unpaid invoices for this customer
      const res = await fetch(`/api/sales?customerId=${customerId}&isFinalized=true&limit=50`);
      const data = await res.json();
      if (res.ok) {
        const unpaid = (data.items || []).filter((s: any) => Number(s.balanceAmount) > 0);
        setCustomerInvoices(unpaid);
      }
    } catch (err) {
      console.error("Error loading customer invoices", err);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid payment amount greater than zero");
      return;
    }

    const allocationsList: Array<{ saleId: string; amount: number }> = [];
    if (allocationMode === "MANUAL") {
      for (const [saleId, allocAmt] of Object.entries(manualAllocations)) {
        if (allocAmt > 0) {
          allocationsList.push({ saleId, amount: allocAmt });
        }
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: numAmount,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
          allocationMode,
          allocations: allocationsList,
          acceptAdvance,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }

      setRecordModalOpen(false);
      resetRecordForm();
      fetchPayments();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  function resetRecordForm() {
    setSelectedCustomerId("");
    setCustomerInvoices([]);
    setAmount("");
    setPaymentMethod("UPI");
    setReferenceNumber("");
    setNotes("");
    setAllocationMode("MANUAL");
    setAcceptAdvance(false);
    setManualAllocations({});
  }

  async function handleReversePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      alert("Please enter a valid written reason of at least 3 characters");
      return;
    }

    try {
      setReversing(true);
      const res = await fetch(`/api/payments/${selectedPayment.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reverse payment");

      setReversalModalOpen(false);
      setReversalReason("");
      setSelectedPayment(null);
      fetchPayments();
    } catch (err: any) {
      alert(err.message || "Error reversing payment");
    } finally {
      setReversing(false);
    }
  }

  async function handleOpenReceipt(payment: PaymentItem) {
    try {
      setSelectedPayment(payment);
      const res = await fetch(`/api/payments/${payment.id}/receipt`);
      const data = await res.json();
      if (res.ok) {
        setReceiptDoc(data.receipt);
        setReceiptModalOpen(true);
      } else {
        alert(data.error || "Failed to load receipt document");
      }
    } catch (err: any) {
      alert(err.message || "Failed to load receipt document");
    }
  }

  const filtered = payments.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.receiptNumber.toLowerCase().includes(term) ||
      p.customer.name.toLowerCase().includes(term) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term));
    const matchesTab = activeTab === "ALL" || p.status === activeTab;
    return matchesSearch && matchesTab;
  });

  // Calculate quick stats
  const totalReceived = payments
    .filter((p) => p.status !== "REVERSED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAdvances = payments
    .filter((p) => p.status !== "REVERSED")
    .reduce((sum, p) => sum + Number(p.unallocatedAmount), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Payments & Receipts
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record customer collections, invoice allocations, advance credits & receipts.
          </p>
        </div>

        <button
          onClick={() => {
            resetRecordForm();
            setRecordModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Received</p>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">
            ₹{totalReceived.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active posted receipts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Advances</p>
          <p className="text-lg sm:text-2xl font-extrabold text-indigo-700 mt-1">
            ₹{totalAdvances.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-indigo-500 mt-0.5">Unallocated credit held</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Receipt Counter</p>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">
            {payments.length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Sequential records</p>
        </div>
      </div>

      {/* 3. Search & Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by receipt #, customer, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "POSTED", "REVERSED"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Payments List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          Loading payment receipts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          No payment records found. Click &quot;Record Payment&quot; to post a new receipt.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method & Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Advance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isReversed = p.status === "REVERSED";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{p.customer.name}</p>
                        <p className="text-[10px] text-slate-400">{p.customer.customerCode}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.paymentMethod}
                          </span>
                          {p.referenceNumber && (
                            <span className="text-[10px] text-slate-400">
                              Ref: {p.referenceNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(p.receivedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{Number(p.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {Number(p.unallocatedAmount) > 0 ? (
                          <span className="font-bold text-indigo-700">
                            ₹{Number(p.unallocatedAmount).toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isReversed
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isReversed ? "REVERSED" : "POSTED"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenReceipt(p)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Printable Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          {!isReversed && (
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setReversalReason("");
                                setReversalModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Reverse Payment"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Record Payment Modal */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Record Customer Payment
                </h3>
              </div>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => onSelectCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode}) - Advance: ₹{Number(c.advanceBalance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-998822"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Optional memo"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Allocation Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Allocation Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "MANUAL", label: "Manual Select" },
                    { id: "OLDEST_FIRST", label: "Auto Oldest-First" },
                    { id: "NONE", label: "Direct Advance" },
                  ].map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setAllocationMode(mode.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        allocationMode === mode.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Invoices Table */}
              {allocationMode === "MANUAL" && selectedCustomerId && (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Select Target Finalized Invoices ({customerInvoices.length} outstanding):
                  </p>
                  {customerInvoices.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No outstanding finalized invoices for this customer. Any amount recorded can be stored as customer advance.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {customerInvoices.map((inv) => {
                        const bal = Number(inv.balanceAmount);
                        const currentVal = manualAllocations[inv.id] || 0;
                        return (
                          <div
                            key={inv.id}
                            className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">
                                {inv.invoiceNumber || inv.saleNumber}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Total: ₹{Number(inv.grandTotal)} | Balance: ₹{bal}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setManualAllocations({
                                    ...manualAllocations,
                                    [inv.id]: bal,
                                  })
                                }
                                className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                              >
                                Max
                              </button>
                              <input
                                type="number"
                                step="0.01"
                                max={bal}
                                placeholder="₹ 0.00"
                                value={currentVal || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setManualAllocations({
                                    ...manualAllocations,
                                    [inv.id]: Math.min(bal, val),
                                  });
                                }}
                                className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-right font-semibold"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Excess Policy Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acceptAdvance"
                  checked={acceptAdvance}
                  onChange={(e) => setAcceptAdvance(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="acceptAdvance" className="text-xs text-slate-700 font-medium">
                  Store any unallocated excess amount as Customer Advance Credit
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Confirm & Post Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Reversal Modal */}
      {reversalModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-base">Reverse Payment</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Reversing receipt <strong>{selectedPayment.receiptNumber}</strong> (₹{Number(selectedPayment.amount)}) will restore invoice outstanding balances and deduct any credited advance.
            </p>

            <form onSubmit={handleReversePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Reversal (Mandatory) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Cheque bounced / Duplicate payment entry / Bank reversal..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversalModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50"
                >
                  {reversing ? "Reversing..." : "Execute Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Printable Receipt Preview Modal */}
      {receiptModalOpen && receiptDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-6">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Official Payment Receipt
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setReceiptModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="mt-6 space-y-6">
              {/* Company Branding */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {receiptDoc.company.name}
                  </h2>
                  <p className="text-xs font-semibold text-emerald-700">
                    Brand: {receiptDoc.company.brand}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{receiptDoc.company.address}</p>
                  <p className="text-xs text-slate-500">GSTIN: {receiptDoc.company.gstin}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-mono font-bold text-xs rounded-lg border border-emerald-200">
                    {receiptDoc.receipt.receiptNumber}
                  </span>
                  <p className="text-xs text-slate-500 mt-2">
                    Date: {new Date(receiptDoc.receipt.receivedAt).toLocaleDateString("en-IN")}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    Status: {receiptDoc.receipt.status}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Received From:
                </p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {receiptDoc.receipt.customer.name}
                </p>
                <p className="text-xs text-slate-600">
                  Code: {receiptDoc.receipt.customer.code} | Phone: {receiptDoc.receipt.customer.phone}
                </p>
                {receiptDoc.receipt.customer.billingAddress && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {receiptDoc.receipt.customer.billingAddress}
                  </p>
                )}
              </div>

              {/* Amount Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-bold text-slate-900">{receiptDoc.receipt.paymentMethod}</span>
                </div>
                {receiptDoc.receipt.referenceNumber && (
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-600">Reference / UTR:</span>
                    <span className="font-mono text-slate-900">
                      {receiptDoc.receipt.referenceNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-600">Total Amount Received:</span>
                  <span className="font-extrabold text-emerald-700 text-base">
                    ₹{Number(receiptDoc.receipt.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Invoice Allocations Table */}
              {receiptDoc.receipt.allocations.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Settled Invoice Allocations:
                  </p>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-2">Invoice #</th>
                        <th className="p-2">Mode</th>
                        <th className="p-2 text-right">Allocated Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receiptDoc.receipt.allocations.map((a: any) => (
                        <tr key={a.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">
                            {a.invoiceNumber}
                          </td>
                          <td className="p-2 text-slate-500">{a.allocationType}</td>
                          <td className="p-2 text-right font-bold text-slate-900">
                            ₹{Number(a.allocatedAmount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Advance Remainder */}
              {Number(receiptDoc.receipt.unallocatedAmount) > 0 && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                  <span className="text-indigo-900 font-semibold">
                    Retained as Customer Advance Credit:
                  </span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    ₹{Number(receiptDoc.receipt.unallocatedAmount).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                <span>Authorized Receipt Generated by {receiptDoc.receipt.createdBy}</span>
                <span>AEVAN Cleaning CRM System Generated Document</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
