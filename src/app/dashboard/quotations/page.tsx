"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Plus,
  ArrowRight,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  X,
  Calendar,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
}

interface QuotationItem {
  id: string;
  product: { id: string; name: string; sku: string; unit: string };
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  customer: Customer;
  quotationDate: string;
  validUntil: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  status: string;
  resultingSale?: { id: string; saleNumber: string; invoiceNumber?: string; isFinalized: boolean } | null;
  items: QuotationItem[];
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<
    Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>
  >([{ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18.0 }]);

  // Reopen modal
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  // Detail Modal State
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);

  // Edit Modal State
  const [editQuotation, setEditQuotation] = useState<Quotation | null>(null);
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [updatingQuotation, setUpdatingQuotation] = useState(false);

  // Delete Confirm State
  const [deleteConfirmQuotation, setDeleteConfirmQuotation] = useState<Quotation | null>(null);
  const [deletingQuotation, setDeletingQuotation] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [quoRes, custRes, prodRes] = await Promise.all([
        fetch("/api/quotations").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/customers").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
      ]);

      setQuotations(quoRes.data || []);
      setCustomers(custRes.data || []);
      setProducts(prodRes.products || []);
      if (custRes.data?.length > 0) setSelectedCustomerId(custRes.data[0].id);

      // Default validUntil to 15 days from now
      const d = new Date();
      d.setDate(d.getDate() + 15);
      setValidUntil(d.toISOString().split("T")[0]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuotation(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validItems = formItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg("Please add at least one product with valid quantity.");
      return;
    }

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          validUntil,
          deliveryCharges: Number(deliveryCharges) || 0,
          notes: notes || null,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quotation");

      setSuccessMsg(`Quotation "${data.quotation.quotationNumber}" created successfully.`);
      setShowCreateModal(false);
      setFormItems([{ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18.0 }]);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleIssueQuotation(q: Quotation) {
    try {
      const res = await fetch(`/api/quotations/${q.id}/issue`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue");

      setSuccessMsg(`Quotation "${q.quotationNumber}" marked as SENT to client.`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleAcceptQuotation(q: Quotation) {
    try {
      const res = await fetch(`/api/quotations/${q.id}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept");

      setSuccessMsg(`Quotation "${q.quotationNumber}" marked as ACCEPTED.`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleConvertToSale(q: Quotation) {
    if (!confirm(`Convert Quotation "${q.quotationNumber}" into a Sale?`)) return;
    try {
      const res = await fetch(`/api/quotations/${q.id}/convert-to-sale`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert to sale");

      setSuccessMsg(`Sale "${data.sale.saleNumber}" created from Quotation "${q.quotationNumber}".`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuotation) return;
    try {
      const res = await fetch(`/api/quotations/${selectedQuotation.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reopen");

      setSuccessMsg(`Quotation "${selectedQuotation.quotationNumber}" reopened.`);
      setShowReopenModal(false);
      setReopenReason("");
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  const handleOpenEditQuotation = (q: Quotation) => {
    setEditQuotation(q);
    setEditValidUntil(q.validUntil ? new Date(q.validUntil).toISOString().split("T")[0] : "");
    setEditNotes((q as any).notes || "");
  };

  const handleUpdateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuotation) return;
    setUpdatingQuotation(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/quotations/${editQuotation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validUntil: editValidUntil || null,
          notes: editNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update quotation");

      setSuccessMsg(`Quotation "${editQuotation.quotationNumber}" updated successfully.`);
      setEditQuotation(null);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdatingQuotation(false);
    }
  };

  const handleDeleteQuotation = async () => {
    if (!deleteConfirmQuotation) return;
    setDeletingQuotation(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/quotations/${deleteConfirmQuotation.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete quotation");

      setSuccessMsg(data.message || `Quotation "${deleteConfirmQuotation.quotationNumber}" deleted successfully.`);
      setDeleteConfirmQuotation(null);
      if (detailQuotation?.id === deleteConfirmQuotation.id) {
        setDetailQuotation(null);
      }
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeletingQuotation(false);
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchSearch =
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.customer?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl pb-16">
      {/* Alerts */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-700 font-bold ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Quotations & Estimates
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Price estimates, validity tracking, and atomic conversion to Sales.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation number (QUO-...) or client name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-600 shadow-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="CONVERTED">Converted to Sale</option>
        </select>
      </div>

      {/* Quotations List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            Loading quotations...
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No quotations found. Click &quot;New Quotation&quot; to generate an estimate.
          </div>
        ) : (
          filteredQuotations.map((q) => (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {q.quotationNumber}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{q.customer?.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {q.items?.map((i) => `${i.quantity}x ${i.product.name}`).join(", ") || "General Line Items"}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    q.status === "CONVERTED"
                      ? "bg-purple-100 text-purple-800"
                      : q.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-800"
                      : q.status === "SENT"
                      ? "bg-blue-100 text-blue-800"
                      : q.status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {q.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px]">Estimate Value: </span>
                  <span className="font-bold text-slate-900">₹{Number(q.grandTotal).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Valid Until: </span>
                  <span className="font-medium text-slate-700">
                    {new Date(q.validUntil).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailQuotation(q)}
                    className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>

                  {q.status !== "CONVERTED" && !q.resultingSale && (
                    <>
                      <button
                        onClick={() => handleOpenEditQuotation(q)}
                        className="px-2.5 py-1.5 text-xs text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        title="Edit quotation"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmQuotation(q)}
                        className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        title="Delete quotation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {q.status === "DRAFT" && (
                    <button
                      onClick={() => handleIssueQuotation(q)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to Client</span>
                    </button>
                  )}

                  {q.status === "SENT" && (
                    <button
                      onClick={() => handleAcceptQuotation(q)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Accepted</span>
                    </button>
                  )}

                  {q.status === "ACCEPTED" && (
                    <button
                      onClick={() => handleConvertToSale(q)}
                      className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <span>Convert to Sale</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(q.status === "REJECTED" || new Date(q.validUntil) < new Date()) && q.status !== "CONVERTED" && (
                    <button
                      onClick={() => {
                        setSelectedQuotation(q);
                        setShowReopenModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE QUOTATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">New Quotation / Estimate</h2>
                <p className="text-xs text-slate-500">Provide price estimate to client (No invoice generated)</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Validity Date</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Charges (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={deliveryCharges}
                    onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Estimate Line Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormItems([
                        ...formItems,
                        { productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18.0 },
                      ])
                    }
                    className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {formItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          const next = [...formItems];
                          next[idx].productId = pId;
                          const found = products.find((p) => p.id === pId);
                          if (found) next[idx].unitPrice = Number(found.basePrice);
                          setFormItems(next);
                        }}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                        required
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — ₹{Number(p.basePrice)}
                          </option>
                        ))}
                      </select>

                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormItems(formItems.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...formItems];
                            next[idx].quantity = parseInt(e.target.value) || 1;
                            setFormItems(next);
                          }}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Unit Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => {
                            const next = [...formItems];
                            next[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setFormItems(next);
                          }}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Disc (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={item.discount}
                          onChange={(e) => {
                            const next = [...formItems];
                            next[idx].discount = parseFloat(e.target.value) || 0;
                            setFormItems(next);
                          }}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-xl font-semibold shadow"
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && selectedQuotation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-slate-900 text-base">Reopen Quotation</h2>
              <button onClick={() => setShowReopenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopen} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Reopening quotation {selectedQuotation.quotationNumber} requires an authorized written justification.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Reopening</label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Client requested revised quantities after budget approval..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold shadow"
                >
                  Reopen Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUOTATION DETAIL MODAL */}
      {detailQuotation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-800 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>Quotation: {detailQuotation.quotationNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailQuotation.status === "CONVERTED"
                          ? "bg-purple-100 text-purple-800"
                          : detailQuotation.status === "ACCEPTED"
                          ? "bg-emerald-100 text-emerald-800"
                          : detailQuotation.status === "SENT"
                          ? "bg-blue-100 text-blue-800"
                          : detailQuotation.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {detailQuotation.status}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Created: {new Date(detailQuotation.quotationDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetailQuotation(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Validity */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 block font-semibold">Client Name</span>
                <span className="font-bold text-slate-900 text-sm">{detailQuotation.customer?.name}</span>
                <span className="text-slate-600 block mt-0.5">{detailQuotation.customer?.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Valid Until</span>
                <span className="font-semibold text-slate-800">
                  {new Date(detailQuotation.validUntil).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </span>
                {(detailQuotation as any).notes && (
                  <span className="text-slate-500 block mt-1 italic">
                    Notes: {(detailQuotation as any).notes}
                  </span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Estimate Line Items:</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Tax</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailQuotation.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <span className="font-bold text-slate-900 block">{item.product?.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">{item.product?.sku}</span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-800">
                          {item.quantity} {item.product?.unit || "pcs"}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          ₹{Number(item.unitPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{item.taxRate}%</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          ₹{Number(item.lineTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 text-xs border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{Number(detailQuotation.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(detailQuotation.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{Number(detailQuotation.discount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-mono">₹{Number(detailQuotation.tax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(detailQuotation.deliveryCharges) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges:</span>
                  <span className="font-mono">₹{Number(detailQuotation.deliveryCharges).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Estimated Value:</span>
                <span className="font-mono text-indigo-950">
                  ₹{Number(detailQuotation.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Resulting Sale Link */}
            {detailQuotation.resultingSale && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-700" />
                  Converted to Sale: {detailQuotation.resultingSale.saleNumber}
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                {detailQuotation.status !== "CONVERTED" && !detailQuotation.resultingSale && (
                  <>
                    {detailQuotation.status === "DRAFT" && (
                      <button
                        onClick={() => {
                          const q = detailQuotation;
                          setDetailQuotation(null);
                          handleIssueQuotation(q);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send to Client
                      </button>
                    )}
                    {detailQuotation.status === "SENT" && (
                      <button
                        onClick={() => {
                          const q = detailQuotation;
                          setDetailQuotation(null);
                          handleAcceptQuotation(q);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Accepted
                      </button>
                    )}
                    {detailQuotation.status === "ACCEPTED" && (
                      <button
                        onClick={() => {
                          const q = detailQuotation;
                          setDetailQuotation(null);
                          handleConvertToSale(q);
                        }}
                        className="px-3.5 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Convert to Sale
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const q = detailQuotation;
                        setDetailQuotation(null);
                        handleOpenEditQuotation(q);
                      }}
                      className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        const q = detailQuotation;
                        setDetailQuotation(null);
                        setDeleteConfirmQuotation(q);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setDetailQuotation(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUOTATION MODAL */}
      {editQuotation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-800 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Edit Quotation: {editQuotation.quotationNumber}</h2>
                  <p className="text-xs text-slate-500">Client: {editQuotation.customer?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditQuotation(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuotation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Validity Expiration Date</label>
                <input
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Scope of Work</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Terms, payment schedules, warranty period..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditQuotation(null)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingQuotation}
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {updatingQuotation ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE QUOTATION MODAL */}
      {deleteConfirmQuotation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Quotation?</h3>
                <p className="text-xs text-slate-500">
                  {deleteConfirmQuotation.quotationNumber} ({deleteConfirmQuotation.customer?.name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
              Are you sure you want to delete this quotation estimate? This action cannot be undone and will be logged in the system audit trail.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteConfirmQuotation(null)}
                disabled={deletingQuotation}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteQuotation}
                disabled={deletingQuotation}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow disabled:opacity-50"
              >
                {deletingQuotation ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
