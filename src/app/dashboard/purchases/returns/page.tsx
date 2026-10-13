"use client";

import { useState, useEffect } from "react";
import {
  Undo2,
  Search,
  Plus,
  AlertCircle,
  Truck,
  Warehouse,
  ShieldAlert,
  FileText,
  X,
  Trash2,
} from "lucide-react";

interface PurchaseReturnLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  product: {
    name: string;
    sku: string;
    unit: string;
  };
}

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  reason: string;
  supplierCreditNoteRef?: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  sourceLocation: {
    id: string;
    name: string;
  };
  createdBy: {
    name: string;
  };
  lines: PurchaseReturnLine[];
}

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [supplierCreditNoteRef, setSupplierCreditNoteRef] = useState("");
  const [lines, setLines] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>>([{ productId: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeReturn, setActiveReturn] = useState<PurchaseReturn | null>(null);

  useEffect(() => {
    fetchReturns();
    fetchMetadata();
  }, [search]);

  async function fetchReturns() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/purchases/returns?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReturns(data.purchaseReturns || []);
      } else {
        setError(data.error || "Failed to load purchase returns");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
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
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  }

  function handleAddLine() {
    setLines([...lines, { productId: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  }

  function handleRemoveLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function handleLineChange(idx: number, field: string, val: any) {
    const updated = [...lines];
    (updated[idx] as any)[field] = val;
    setLines(updated);
  }

  const subtotal = lines.reduce((sum, it) => sum + (it.quantity * it.unitPrice || 0), 0);
  const taxTotal = lines.reduce(
    (sum, it) => sum + (it.quantity * it.unitPrice * (it.taxRate / 100) || 0),
    0
  );
  const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

  async function handleCreateReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierId || !selectedLocationId || !reason.trim()) {
      alert("Please fill supplier, source location, and reason");
      return;
    }
    if (lines.some((l) => !l.productId || l.quantity <= 0 || l.unitPrice <= 0)) {
      alert("All lines must specify product, positive quantity, and unit price");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/purchases/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          sourceLocationId: selectedLocationId,
          reason: reason.trim(),
          supplierCreditNoteRef: supplierCreditNoteRef || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            taxRate: Number(l.taxRate),
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        fetchReturns();
      } else {
        alert(data.error || "Failed to process purchase return");
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
          <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
            <Undo2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Purchase Returns</h1>
            <p className="text-xs text-slate-500">
              Goods returned to vendors, physical stock deductions & supplier credit notes
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
          <span>New Purchase Return</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by return number or vendor..."
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

      {/* Return List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading purchase returns...</div>
      ) : returns.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Undo2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800">No purchase returns recorded</h3>
          <p className="text-xs text-slate-500">Record returns for damaged goods sent back to vendors.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {returns.map((ret) => (
            <div
              key={ret.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                      {ret.returnNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{ret.supplier.name}</h3>
                    <p className="text-xs text-slate-500">From: {ret.sourceLocation.name}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    POSTED
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 my-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Return Date:</span>
                    <span>{new Date(ret.returnDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>Credit Value:</span>
                    <span>₹{ret.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic truncate mt-1">
                    "{ret.reason}"
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">By {ret.createdBy.name}</span>
                <button
                  onClick={() => {
                    setActiveReturn(ret);
                    setDetailModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-900 bg-brand-50 px-2.5 py-1.5 rounded-lg border border-brand-200"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Purchase Return */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-rose-700" />
                <h2 className="text-base font-bold text-slate-900">Record Purchase Return</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>
                  <strong>Strict Inventory Integrity:</strong> Returning goods will immediately
                  deduct physical stock from the selected warehouse with a RETURN ledger movement and
                  reduce your outstanding payable debt to this vendor. Sufficient physical stock
                  must be available.
                </span>
              </div>

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
                    Source Warehouse *
                  </label>
                  <select
                    required
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="">-- Choose Warehouse to Deduct --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Return Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chemical acidity out of specification, batch returned to supplier"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Return Lines
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
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
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
                        Return Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={l.quantity}
                        onChange={(e) => handleLineChange(idx, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-center"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={l.unitPrice}
                        onChange={(e) => handleLineChange(idx, "unitPrice", Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-right"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        GST %
                      </label>
                      <select
                        value={l.taxRate}
                        onChange={(e) => handleLineChange(idx, "taxRate", Number(e.target.value))}
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
                ))}
              </div>

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
                  <span>Credit Total:</span>
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
                  className="px-5 py-2 bg-rose-700 text-white rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50"
                >
                  {submitting ? "Processing..." : "Confirm & Post Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && activeReturn && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeReturn.returnNumber}</h3>
                <p className="text-xs text-slate-500">
                  {activeReturn.supplier.name} (from {activeReturn.sourceLocation.name})
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
              <h4 className="text-xs font-bold text-slate-800 uppercase">Returned Products</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {activeReturn.lines.map((l) => (
                  <div key={l.id} className="p-3 text-xs flex justify-between items-center bg-white">
                    <div>
                      <p className="font-semibold text-slate-900">{l.product.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {l.quantity} units @ ₹{l.unitPrice} (+{l.taxRate}% GST)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">₹{l.lineTotal.toFixed(2)}</p>
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
