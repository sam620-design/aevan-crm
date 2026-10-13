"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Search,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building2,
  Calendar,
  X,
  Trash2,
  FileCheck,
} from "lucide-react";

interface SupplierBillItem {
  id: string;
  productId?: string | null;
  productName?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  product?: {
    name: string;
    sku: string;
  } | null;
}

interface SupplierBill {
  id: string;
  billNumber: string;
  supplierInvoiceNumber: string;
  billDate: string;
  dueDate?: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  freight: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  items: SupplierBillItem[];
}

export default function SupplierBillsPage() {
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [freight, setFreight] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>>([{ productId: "", productName: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);

  useEffect(() => {
    fetchBills();
    fetchMetadata();
  }, [search, statusFilter]);

  async function fetchBills() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/purchases/bills?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setBills(data.bills || []);
      } else {
        setError(data.error || "Failed to load supplier bills");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [suppRes, prodRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/products"),
      ]);
      const [suppData, prodData] = await Promise.all([suppRes.json(), prodRes.json()]);

      if (suppRes.ok) setSuppliers(Array.isArray(suppData?.suppliers) ? suppData.suppliers : Array.isArray(suppData) ? suppData : []);
      if (prodRes.ok) {
        const list = Array.isArray(prodData?.products)
          ? prodData.products
          : Array.isArray(prodData?.data)
          ? prodData.data
          : Array.isArray(prodData)
          ? prodData
          : [];
        setProducts(list);
      }
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  }

  function handleAddItem() {
    setItems([
      ...items,
      { productId: "", productName: "", quantity: 1, unitPrice: 0, taxRate: 18 },
    ]);
  }

  function handleRemoveItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleItemChange(idx: number, field: string, val: any) {
    const updated = [...items];
    const item = { ...updated[idx], [field]: val };
    if (field === "productId") {
      const prod = products.find((p) => p.id === val);
      if (prod) item.productName = prod.name;
    }
    updated[idx] = item;
    setItems(updated);
  }

  const subtotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice || 0), 0);
  const taxTotal = items.reduce(
    (sum, it) => sum + (it.quantity * it.unitPrice * (it.taxRate / 100) || 0),
    0
  );
  const grandTotal = Math.round((subtotal + taxTotal + Number(freight)) * 100) / 100;

  async function handleCreateBill(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId || !supplierInvoiceNumber.trim()) {
      alert("Please select supplier and enter their invoice number");
      return;
    }
    if (items.some((it) => it.quantity <= 0 || it.unitPrice <= 0)) {
      alert("All line items must have positive quantity and unit price");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/purchases/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          supplierInvoiceNumber: supplierInvoiceNumber.trim(),
          dueDate: dueDate || undefined,
          freight: Number(freight) || 0,
          notes,
          items: items.map((it) => ({
            productId: it.productId || undefined,
            productName: it.productName || undefined,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate),
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchBills();
      } else {
        alert(data.error || "Failed to create supplier bill");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "UNPAID":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "PARTIALLY_PAID":
        return "bg-blue-50 text-blue-700 border-blue-300";
      case "PAID":
        return "bg-emerald-50 text-emerald-700 border-emerald-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Supplier Bills & Invoices</h1>
            <p className="text-xs text-slate-500">
              Vendor commercial invoices, accounts payable liabilities & GST input credits
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedSupplierId(suppliers[0]?.id || "");
            setSupplierInvoiceNumber("");
            setDueDate("");
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-900 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vendor Bill</span>
        </button>
      </div>

      {/* Filter / Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill number, vendor invoice no, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-700"
        >
          <option value="">All Statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Fully Paid</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bill List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading supplier bills...</div>
      ) : bills.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No vendor bills recorded</h3>
          <p className="text-xs text-slate-500">Record incoming vendor invoices to track payable debts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bills.map((bill) => (
            <div
              key={bill.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {bill.billNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{bill.supplier.name}</h3>
                    <p className="text-xs text-brand-700 font-mono font-medium">
                      Inv Ref: {bill.supplierInvoiceNumber}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      bill.status
                    )}`}
                  >
                    {bill.status.replace("_", " ")}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 my-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bill Date:</span>
                    <span>{new Date(bill.billDate).toLocaleDateString()}</span>
                  </div>
                  {bill.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due Date:</span>
                      <span className="font-medium text-amber-700">
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Total Amount:</span>
                    <span>₹{bill.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Balance Due:</span>
                    <span>₹{bill.balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <Link
                  href={`/dashboard/supplier-ledger?supplierId=${bill.supplier.id}`}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  View Ledger
                </Link>

                {bill.balanceAmount > 0 && (
                  <Link
                    href={`/dashboard/supplier-payments?supplierId=${bill.supplier.id}&billId=${bill.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-semibold border border-brand-200"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Bill</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Bill Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-700" />
                <h2 className="text-base font-bold text-slate-900">Record Vendor Bill</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    Vendor Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-9921"
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Billed Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Product / Description
                      </label>
                      <select
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">-- Catalog Item or Custom --</option>
                        {(Array.isArray(products) ? products : []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      {!it.productId && (
                        <input
                          type="text"
                          placeholder="Or enter custom item name"
                          value={it.productName}
                          onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                          className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-right"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        GST %
                      </label>
                      <select
                        value={it.taxRate}
                        onChange={(e) => handleItemChange(idx, "taxRate", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount:</span>
                  <span>₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 text-sm">
                  <span>Bill Total:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
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
                  className="px-5 py-2 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-900 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Record Vendor Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
