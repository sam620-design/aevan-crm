"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Search,
  Plus,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  X,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  amount: number;
  unallocatedAmount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string | null;
  status: string;
  notes?: string | null;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  recordedBy: {
    name: string;
  };
  allocations: Array<{
    id: string;
    allocatedAmount: number;
    bill: {
      billNumber: string;
      supplierInvoiceNumber: string;
      grandTotal: number;
      balanceAmount: number;
    };
  }>;
}

export default function SupplierPaymentsPage() {
  const searchParams = useSearchParams();
  const prefillSupplierId = searchParams.get("supplierId");
  const prefillBillId = searchParams.get("billId");

  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Record Form
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<{ [billId: string]: number }>({});

  // Reversal Modal
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchSuppliers();
  }, [search]);

  useEffect(() => {
    if (prefillSupplierId) {
      setSelectedSupplierId(prefillSupplierId);
      setModalOpen(true);
    }
  }, [prefillSupplierId]);

  useEffect(() => {
    if (selectedSupplierId) {
      fetchSupplierPendingBills(selectedSupplierId);
    } else {
      setSupplierBills([]);
      setAllocations({});
    }
  }, [selectedSupplierId]);

  async function fetchPayments() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/supplier-payments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
      } else {
        setError(data.error || "Failed to load supplier payments");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (res.ok) setSuppliers(data.suppliers || []);
    } catch (e) {
      console.error("Failed to load suppliers", e);
    }
  }

  async function fetchSupplierPendingBills(supplierId: string) {
    try {
      const res = await fetch(`/api/purchases/bills?supplierId=${supplierId}`);
      const data = await res.json();
      if (res.ok) {
        const unpaid = (data.bills || []).filter((b: any) => b.balanceAmount > 0);
        setSupplierBills(unpaid);

        if (prefillBillId) {
          const match = unpaid.find((b: any) => b.id === prefillBillId);
          if (match) {
            setAmount(match.balanceAmount.toString());
            setAllocations({ [match.id]: match.balanceAmount });
          }
        }
      }
    } catch (e) {
      console.error("Failed to load pending bills", e);
    }
  }

  function handleAllocationChange(billId: string, val: number) {
    setAllocations({ ...allocations, [billId]: val });
  }

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remainingUnallocated = Math.max(0, (Number(amount) || 0) - totalAllocated);

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId || Number(amount) <= 0) {
      alert("Please select supplier and enter a valid positive payment amount");
      return;
    }
    if (totalAllocated > Number(amount)) {
      alert("Allocated amount cannot exceed total payment amount");
      return;
    }

    try {
      setSubmitting(true);
      const allocationList = Object.entries(allocations)
        .filter(([_, amt]) => Number(amt) > 0)
        .map(([billId, amt]) => ({ billId, amount: Number(amt) }));

      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          amount: Number(amount),
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
          allocations: allocationList,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        setAmount("");
        setAllocations({});
        fetchPayments();
      } else {
        alert(data.error || "Failed to record payment");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReversal() {
    if (!reversingPaymentId || !reversalReason.trim()) {
      alert("Please provide a valid reversal reason");
      return;
    }
    try {
      setReversing(true);
      const res = await fetch(`/api/supplier-payments/${reversingPaymentId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setReversalModalOpen(false);
        setReversingPaymentId(null);
        setReversalReason("");
        fetchPayments();
      } else {
        alert(data.error || "Failed to reverse payment");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setReversing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Supplier Payments</h1>
            <p className="text-xs text-slate-500">
              Vendor disbursements, bill allocations & advance settlements
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedSupplierId(suppliers[0]?.id || "");
            setAmount("");
            setAllocations({});
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-900 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vendor Payment</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by payment voucher, reference, or supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payment List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading supplier payments...</div>
      ) : payments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No supplier payments recorded</h3>
          <p className="text-xs text-slate-500">Disburse payments to reduce accounts payable liabilities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {p.paymentNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{p.supplier.name}</h3>
                    <p className="text-xs text-slate-500">Method: {p.paymentMethod.replace("_", " ")}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 my-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span>{new Date(p.paymentDate).toLocaleDateString()}</span>
                  </div>
                  {p.referenceNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ref:</span>
                      <span className="font-mono">{p.referenceNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-emerald-700 text-sm">
                    <span>Disbursed:</span>
                    <span>₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {p.unallocatedAmount > 0 && (
                    <div className="flex justify-between font-medium text-amber-600">
                      <span>Vendor Advance:</span>
                      <span>₹{p.unallocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 pt-1">
                    Allocated to {p.allocations.length} bill(s)
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">By {p.recordedBy.name}</span>
                {p.status === "COMPLETED" && (
                  <button
                    onClick={() => {
                      setReversingPaymentId(p.id);
                      setReversalModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reverse</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">Record Vendor Disbursement</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursement Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">NEFT / RTGS / IMPS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR128994827"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pending Bills Allocation */}
              {supplierBills.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-800 uppercase">
                      Allocate to Outstanding Bills
                    </h3>
                    <span className="text-xs text-slate-500">
                      Allocated: ₹{totalAllocated.toFixed(2)} | Advance: ₹
                      {remainingUnallocated.toFixed(2)}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {supplierBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="p-3 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{bill.billNumber}</p>
                          <p className="text-[11px] text-slate-500">
                            Inv Ref: {bill.supplierInvoiceNumber} | Due: ₹{bill.balanceAmount.toFixed(2)}
                          </p>
                        </div>

                        <div className="w-32">
                          <input
                            type="number"
                            min="0"
                            max={bill.balanceAmount}
                            step="0.01"
                            value={allocations[bill.id] || ""}
                            onChange={(e) =>
                              handleAllocationChange(bill.id, Number(e.target.value))
                            }
                            placeholder="₹0.00"
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs text-right font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment remarks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal */}
      {reversalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reverse Supplier Payment</h3>
            <p className="text-xs text-slate-500">
              Provide a mandatory reason for reversing this payment. Unpaid balances will be
              restored on all allocated bills and an auditable reversal entry will be posted.
            </p>
            <textarea
              rows={3}
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Bank bounced payment, duplicate transfer"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setReversalModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReversal}
                disabled={reversing || !reversalReason.trim()}
                className="px-4 py-2 bg-rose-700 text-white rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50"
              >
                {reversing ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
