"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Truck,
  ArrowRight,
  Send,
  Check,
  Ban,
  PackageCheck,
  X,
  Trash2,
} from "lucide-react";

interface PurchaseOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  receivedQty: number;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  freight: number;
  grandTotal: number;
  notes?: string | null;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  location: {
    id: string;
    name: string;
  };
  createdBy: {
    name: string;
  };
  items: PurchaseOrderItem[];
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [freight, setFreight] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>>([{ productId: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingPoId, setCancellingPoId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchOrders();
    fetchMetadata();
  }, [search, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/purchases/orders?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      } else {
        setError(data.error || "Failed to load purchase orders");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [suppRes, locRes, prodRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/locations"),
        fetch("/api/products"),
      ]);
      const [suppData, locData, prodData] = await Promise.all([
        suppRes.json(),
        locRes.json(),
        prodRes.json(),
      ]);

      if (suppRes.ok) setSuppliers(suppData.suppliers || []);
      if (locRes.ok) setLocations(locData.locations || locData || []);
      if (prodRes.ok) setProducts(prodData.products || prodData || []);
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  }

  function handleAddItem() {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  }

  function handleRemoveItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleItemChange(idx: number, field: string, value: any) {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  }

  const subtotal = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice || 0), 0);
  const taxTotal = items.reduce(
    (sum, it) => sum + (it.quantity * it.unitPrice * (it.taxRate / 100) || 0),
    0
  );
  const grandTotal = Math.round((subtotal + taxTotal + Number(freight)) * 100) / 100;

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId || !selectedLocationId) {
      alert("Please select supplier and destination location");
      return;
    }
    if (items.some((it) => !it.productId || it.quantity <= 0)) {
      alert("Please select products with valid quantities");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/purchases/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          locationId: selectedLocationId,
          expectedDeliveryDate: expectedDate || undefined,
          freight: Number(freight) || 0,
          notes,
          items: items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate),
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchOrders();
      } else {
        alert(data.error || "Failed to create PO");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitOrder(id: string) {
    try {
      const res = await fetch(`/api/purchases/orders/${id}/submit`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchOrders();
      } else {
        alert(data.error || "Failed to submit PO");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    }
  }

  async function handleApproveOrder(id: string) {
    try {
      const res = await fetch(`/api/purchases/orders/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchOrders();
      } else {
        alert(data.error || "Failed to approve PO");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingPoId) return;
    try {
      const res = await fetch(`/api/purchases/orders/${cancellingPoId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setCancelModalOpen(false);
        setCancellingPoId(null);
        setCancelReason("");
        fetchOrders();
      } else {
        alert(data.error || "Failed to cancel PO");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "SUBMITTED":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "APPROVED":
        return "bg-blue-50 text-blue-700 border-blue-300";
      case "PARTIALLY_RECEIVED":
        return "bg-indigo-50 text-indigo-700 border-indigo-300";
      case "RECEIVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-300";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-300";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-50 text-brand-700 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Purchase Orders</h1>
            <p className="text-xs text-slate-500">
              Procurement commitments & formal supplier purchase orders
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedSupplierId(suppliers[0]?.id || "");
            setSelectedLocationId(locations[0]?.id || "");
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-900 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter / Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO number or supplier name..."
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
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Fully Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PO List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading purchase orders...</div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No purchase orders found</h3>
          <p className="text-xs text-slate-500">Create a purchase order to start procurement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((po) => (
            <div
              key={po.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {po.poNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{po.supplier.name}</h3>
                    <p className="text-xs text-slate-500">To: {po.location.name}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      po.status
                    )}`}
                  >
                    {po.status}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 my-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span>{new Date(po.orderDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Items:</span>
                    <span>{po.items.length} line item(s)</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Grand Total:</span>
                    <span>₹{po.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2 flex-wrap">
                {po.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmitOrder(po.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-semibold border border-brand-200"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </button>
                )}

                {po.status === "SUBMITTED" && (
                  <button
                    onClick={() => handleApproveOrder(po.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {(po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED") && (
                  <Link
                    href={`/dashboard/purchases/receiving?poId=${po.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Receive</span>
                  </Link>
                )}

                {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                  <button
                    onClick={() => {
                      setCancellingPoId(po.id);
                      setCancelModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Cancel PO"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Purchase Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-700" />
                <h2 className="text-base font-bold text-slate-900">Create Purchase Order</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
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
                    Destination Warehouse *
                  </label>
                  <select
                    required
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="">-- Choose Location --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Freight / Shipping (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={freight}
                    onChange={(e) => setFreight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Order Items
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
                        Product
                      </label>
                      <select
                        required
                        value={it.productId}
                        onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
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
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
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

              {/* Summary Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Amount:</span>
                  <span>₹{taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Freight:</span>
                  <span>₹{Number(freight || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 text-sm">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Procurement Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms, delivery instructions, reference..."
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
                  className="px-5 py-2 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-900 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Cancel Purchase Order</h3>
            <p className="text-xs text-slate-500">
              Please provide a valid cancellation reason. This action is permanently audited.
            </p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Vendor unable to supply raw materials on requested date"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
