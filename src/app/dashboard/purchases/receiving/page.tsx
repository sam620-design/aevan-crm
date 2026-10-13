"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  PackageCheck,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Truck,
  Warehouse,
  Calendar,
  X,
  Trash2,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface GoodsReceiptLine {
  id: string;
  productId: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string | null;
  product: {
    name: string;
    sku: string;
    unit: string;
  };
}

interface GoodsReceipt {
  id: string;
  grnNumber: string;
  receivedDate: string;
  status: string;
  notes?: string | null;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  destinationLocation: {
    id: string;
    name: string;
  };
  purchaseOrder?: {
    poNumber: string;
  } | null;
  receivedBy: {
    name: string;
  };
  lines: GoodsReceiptLine[];
}

export default function GoodsReceivingPage() {
  const searchParams = useSearchParams();
  const prefillPoId = searchParams.get("poId");

  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Array<{
    productId: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    rejectionReason: string;
  }>>([{ productId: "", receivedQty: 1, acceptedQty: 1, rejectedQty: 0, rejectionReason: "" }]);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<GoodsReceipt | null>(null);

  useEffect(() => {
    fetchReceipts();
    fetchMetadata();
  }, [search]);

  useEffect(() => {
    if (prefillPoId && purchaseOrders.length > 0) {
      const match = purchaseOrders.find((p) => p.id === prefillPoId);
      if (match) {
        setSelectedPoId(match.id);
        setSelectedSupplierId(match.supplierId);
        setSelectedLocationId(match.locationId);
        if (match.items && match.items.length > 0) {
          setLines(
            match.items.map((it: any) => ({
              productId: it.productId,
              receivedQty: it.quantity - it.receivedQty > 0 ? it.quantity - it.receivedQty : it.quantity,
              acceptedQty: it.quantity - it.receivedQty > 0 ? it.quantity - it.receivedQty : it.quantity,
              rejectedQty: 0,
              rejectionReason: "",
            }))
          );
        }
        setModalOpen(true);
      }
    }
  }, [prefillPoId, purchaseOrders]);

  async function fetchReceipts() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/purchases/receiving?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReceipts(data.goodsReceipts || []);
      } else {
        setError(data.error || "Failed to load goods receipts");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [suppRes, locRes, prodRes, poRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/locations"),
        fetch("/api/products"),
        fetch("/api/purchases/orders?status=APPROVED"),
      ]);
      const [suppData, locData, prodData, poData] = await Promise.all([
        suppRes.json(),
        locRes.json(),
        prodRes.json(),
        poRes.json(),
      ]);

      if (suppRes.ok) setSuppliers(Array.isArray(suppData?.suppliers) ? suppData.suppliers : Array.isArray(suppData) ? suppData : []);
      if (locRes.ok) setLocations(Array.isArray(locData?.locations) ? locData.locations : Array.isArray(locData) ? locData : []);
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
      if (poRes.ok) setPurchaseOrders(Array.isArray(poData?.orders) ? poData.orders : Array.isArray(poData) ? poData : []);
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  }

  function handleAddLine() {
    setLines([
      ...lines,
      { productId: "", receivedQty: 1, acceptedQty: 1, rejectedQty: 0, rejectionReason: "" },
    ]);
  }

  function handleRemoveLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function handleLineChange(idx: number, field: string, val: any) {
    const updated = [...lines];
    const current = { ...updated[idx], [field]: val };

    if (field === "receivedQty") {
      current.acceptedQty = Number(val) - (current.rejectedQty || 0);
    } else if (field === "rejectedQty") {
      current.acceptedQty = (current.receivedQty || 0) - Number(val);
    }

    updated[idx] = current;
    setLines(updated);
  }

  async function handleCreateReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId || !selectedLocationId) {
      alert("Please select supplier and destination warehouse");
      return;
    }
    if (lines.some((l) => !l.productId || l.receivedQty <= 0)) {
      alert("Please select products and valid received quantities");
      return;
    }
    if (lines.some((l) => l.rejectedQty > 0 && !l.rejectionReason?.trim())) {
      alert("Please provide a rejection reason for all quarantined items");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/purchases/receiving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          destinationLocationId: selectedLocationId,
          purchaseOrderId: selectedPoId || undefined,
          notes,
          lines: lines.map((l) => ({
            productId: l.productId,
            receivedQty: Number(l.receivedQty),
            acceptedQty: Number(l.acceptedQty),
            rejectedQty: Number(l.rejectedQty || 0),
            rejectionReason: l.rejectedQty > 0 ? l.rejectionReason : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchReceipts();
      } else {
        alert(data.error || "Failed to create goods receipt");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Goods Receiving (GRN)</h1>
            <p className="text-xs text-slate-500">
              Inward physical warehouse gate arrivals & quarantine quality checks
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedSupplierId(suppliers[0]?.id || "");
            setSelectedLocationId(locations[0]?.id || "");
            setSelectedPoId(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-900 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Inward GRN</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by GRN number or vendor..."
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

      {/* Receipts List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading goods receipts...</div>
      ) : receipts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No goods receipts found</h3>
          <p className="text-xs text-slate-500">Record incoming goods to increment stock.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receipts.map((grn) => {
            const totalAccepted = grn.lines.reduce((s, l) => s + l.acceptedQty, 0);
            const totalRejected = grn.lines.reduce((s, l) => s + l.rejectedQty, 0);

            return (
              <div
                key={grn.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {grn.grnNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{grn.supplier.name}</h3>
                      <p className="text-xs text-slate-500">To: {grn.destinationLocation.name}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      POSTED
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 my-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Received Date:</span>
                      <span>{new Date(grn.receivedDate).toLocaleDateString()}</span>
                    </div>
                    {grn.purchaseOrder && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Linked PO:</span>
                        <span className="font-mono font-medium">{grn.purchaseOrder.poNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-slate-800">
                      <span>Accepted Stock:</span>
                      <span className="text-emerald-700 font-bold">+{totalAccepted} units</span>
                    </div>
                    {totalRejected > 0 && (
                      <div className="flex justify-between font-medium text-red-600">
                        <span>Quarantined / Rejected:</span>
                        <span>{totalRejected} units</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">By {grn.receivedBy.name}</span>
                  <button
                    onClick={() => {
                      setActiveReceipt(grn);
                      setDetailModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 px-2.5 py-1.5 rounded-lg border border-brand-200"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Lines</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Record Inward GRN */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-bold text-slate-900">Record Inward Goods Receipt (GRN)</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  <strong>Strict Inventory Rule:</strong> Only <em>Accepted Quantities</em> will be
                  credited into your inventory balances with immutable INWARD movements. Damaged or
                  rejected units are quarantined and never enter saleable stock.
                </span>
              </div>

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
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Linked PO (Optional)
                  </label>
                  <select
                    value={selectedPoId || ""}
                    onChange={(e) => setSelectedPoId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="">-- Direct Receipt (No PO) --</option>
                    {purchaseOrders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.poNumber} ({p.supplier.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Receipt Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Physical Arrival Lines
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                {lines.map((l, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Product
                        </label>
                        <select
                          required
                          value={l.productId}
                          onChange={(e) => handleLineChange(idx, "productId", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="">-- Select Product --</option>
                          {(Array.isArray(products) ? products : []).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Arrived Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={l.receivedQty}
                          onChange={(e) => handleLineChange(idx, "receivedQty", Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-center font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-emerald-700 mb-0.5">
                          Accepted Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={l.acceptedQty}
                          onChange={(e) => handleLineChange(idx, "acceptedQty", Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded-lg text-xs bg-emerald-50 text-emerald-800 text-center font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-red-600 mb-0.5">
                          Rejected Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={l.rejectedQty}
                          onChange={(e) => handleLineChange(idx, "rejectedQty", Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-red-300 rounded-lg text-xs bg-red-50 text-red-800 text-center font-bold"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {l.rejectedQty > 0 && (
                      <div className="pt-1">
                        <input
                          type="text"
                          required
                          placeholder="Mandatory rejection reason (e.g. broken seal, damaged barrel, leaked bottle)..."
                          value={l.rejectionReason}
                          onChange={(e) => handleLineChange(idx, "rejectionReason", e.target.value)}
                          className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-xs bg-white text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery / Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Carrier name, vehicle number, delivery slip ref..."
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
                  {submitting ? "Posting..." : "Confirm & Post Inward Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeReceipt.grnNumber}</h3>
                <p className="text-xs text-slate-500">
                  {activeReceipt.supplier.name} → {activeReceipt.destinationLocation.name}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase">Received Lines</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {activeReceipt.lines.map((l) => (
                  <div key={l.id} className="p-3 text-xs flex justify-between items-center bg-white">
                    <div>
                      <p className="font-semibold text-slate-900">{l.product.name}</p>
                      <p className="text-[11px] text-slate-500">SKU: {l.product.sku}</p>
                      {l.rejectedQty > 0 && (
                        <p className="text-[11px] text-red-600 mt-0.5">
                          Reason: {l.rejectionReason || "Damaged on arrival"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">+{l.acceptedQty} accepted</p>
                      {l.rejectedQty > 0 && (
                        <p className="text-red-600 font-medium">({l.rejectedQty} rejected)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
