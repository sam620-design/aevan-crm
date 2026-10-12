"use client";

import { useState, useEffect } from "react";
import {
  PackageMinus,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  FileCheck,
  Send,
  Lock,
  Unlock,
  Building,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Location {
  id: string;
  name: string;
  code: string;
}

interface OutwardLine {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unit: string;
  reconciledQty: number;
  discrepancyQty: number;
}

interface OutwardEntry {
  id: string;
  outwardNumber: string;
  status: string;
  sourceLocation: Location;
  purpose: string;
  takenBy: string;
  destination?: string | null;
  notes?: string | null;
  totalDispatchedQty: number;
  totalReconciledQty: number;
  totalDiscrepancyQty: number;
  discrepancyReason?: string | null;
  hasDiscrepancy: boolean;
  responsibleStaff: { id: string; name: string; email: string };
  lines: OutwardLine[];
  reconciliations: Array<{
    id: string;
    productId: string;
    disposition: string;
    quantity: number;
    isReturnProcessed: boolean;
    notes?: string;
  }>;
  createdAt: string;
  dispatchedAt?: string | null;
  closedAt?: string | null;
}

export default function InventoryOutwardPage() {
  const [entries, setEntries] = useState<OutwardEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<OutwardEntry | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  // Form states
  const [formSourceLoc, setFormSourceLoc] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formTakenBy, setFormTakenBy] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formLines, setFormLines] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: "", quantity: 1 },
  ]);

  // Reconciliation form state
  const [reconDispositions, setReconDispositions] = useState<
    Array<{ productId: string; disposition: string; quantity: number; notes: string }>
  >([]);

  // Approval form state
  const [approvalReason, setApprovalReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");

  // Reopen form state
  const [reopenReason, setReopenReason] = useState("");

  // Return modal state
  const [returnReconId, setReturnReconId] = useState("");
  const [returnLocId, setReturnLocId] = useState("");
  const [returnQty, setReturnQty] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [outRes, prodRes, locRes] = await Promise.all([
        fetch("/api/inventory/outward").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
        fetch("/api/locations").then((r) => (r.ok ? r.json() : { locations: [] })),
      ]);

      setEntries(outRes.data || []);
      setProducts(prodRes.products || []);
      setLocations(locRes.locations || []);
      if (locRes.locations?.length > 0) {
        setFormSourceLoc(locRes.locations[0].id);
        setReturnLocId(locRes.locations[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOutward(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validLines = formLines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) {
      setErrorMsg("Please add at least one product line with valid quantity.");
      return;
    }

    try {
      const res = await fetch("/api/inventory/outward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocationId: formSourceLoc,
          purpose: formPurpose,
          takenBy: formTakenBy,
          notes: formNotes || null,
          lines: validLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create outward draft");

      setSuccessMsg(`Outward draft "${data.outward.outwardNumber}" created successfully.`);
      setShowCreateModal(false);
      setFormLines([{ productId: "", quantity: 1 }]);
      setFormPurpose("");
      setFormTakenBy("");
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleDispatch(entry: OutwardEntry) {
    if (!confirm(`Confirm physical dispatch for ${entry.outwardNumber}? This will atomically deduct ${entry.totalDispatchedQty} units from source location stock.`)) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/inventory/outward/${entry.id}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispatch failed");

      setSuccessMsg(`Outward "${entry.outwardNumber}" physically dispatched. Stock balances deducted.`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  function openReconciliation(entry: OutwardEntry) {
    setSelectedEntry(entry);
    const initialDisps: Array<{ productId: string; disposition: string; quantity: number; notes: string }> = [];

    entry.lines.forEach((line) => {
      // Find existing reconciliations or default to SOLD
      const existing = entry.reconciliations.filter((r) => r.productId === line.productId);
      if (existing.length > 0) {
        existing.forEach((r) => {
          initialDisps.push({
            productId: line.productId,
            disposition: r.disposition,
            quantity: r.quantity,
            notes: r.notes || "",
          });
        });
      } else {
        initialDisps.push({
          productId: line.productId,
          disposition: "SOLD",
          quantity: line.quantity,
          notes: "",
        });
      }
    });

    setReconDispositions(initialDisps);
    setShowReconcileModal(true);
  }

  async function handleSaveReconciliation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/inventory/outward/${selectedEntry.id}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reconDispositions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reconcile");

      setSuccessMsg(`Quantity reconciliation recorded for ${selectedEntry.outwardNumber}.`);
      setShowReconcileModal(false);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleApproveDiscrepancy(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/inventory/outward/${selectedEntry.id}/approve-discrepancy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: approvalReason, notes: approvalNotes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      setSuccessMsg(`Discrepancy for ${selectedEntry.outwardNumber} formally approved.`);
      setShowApprovalModal(false);
      setApprovalReason("");
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleProcessReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry || !returnReconId) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/inventory/outward/${selectedEntry.id}/return-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reconciliationId: returnReconId,
          locationId: returnLocId,
          quantity: returnQty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process return");

      setSuccessMsg(`Returned stock credited to inventory.`);
      setShowReturnModal(false);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleClose(entry: OutwardEntry) {
    if (!confirm(`Are you sure you want to close ${entry.outwardNumber}?`)) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/inventory/outward/${entry.id}/close`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Closure failed");

      setSuccessMsg(`Outward entry ${entry.outwardNumber} successfully closed.`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/inventory/outward/${selectedEntry.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reopenReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reopen failed");

      setSuccessMsg(`Outward entry ${selectedEntry.outwardNumber} reopened.`);
      setShowReopenModal(false);
      setReopenReason("");
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  const filteredEntries = entries.filter((e) => {
    const matchSearch =
      e.outwardNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.purpose.toLowerCase().includes(search.toLowerCase()) ||
      e.takenBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl pb-16">
      {/* Notifications */}
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
            <PackageMinus className="w-5 h-5 text-amber-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Inventory Outward (Physical Movement)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Physical stock tracking, zero double-deduction, and mandatory 100% quantity reconciliation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Outward Entry</span>
        </button>
      </div>

      {/* Core Inventory Guarantees Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-amber-950">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          <span>Core Inventory Guarantees & Reconciliation Rules:</span>
        </p>
        <p>
          • <strong>Zero Double-Deduction:</strong> Stock is physically deducted at Outward dispatch. Linking outward quantity to a Sale or Transfer never deducts stock again.
        </p>
        <p>
          • <strong>Mandatory 100% Reconciliation:</strong> Dispatched quantity must be fully accounted for (Sold, Transferred, Returned, Consumed, Damaged, Other) before closure. Discrepancies require Superadmin-approved written sign-off.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by OUT reference, taker name, or purpose..."
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
          <option value="DISPATCHED">Dispatched</option>
          <option value="RECONCILED">Reconciled</option>
          <option value="DISCREPANCY_PENDING">Discrepancy Pending</option>
          <option value="DISCREPANCY_APPROVED">Discrepancy Approved</option>
          <option value="CLOSED">Closed</option>
          <option value="REOPENED">Reopened</option>
        </select>
      </div>

      {/* List Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            Loading outward records...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No outward records found. Create a new entry to get started.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      {entry.outwardNumber}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {entry.sourceLocation?.name || "Main Warehouse"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">
                    {entry.lines?.map((l) => `${l.product.name} (${l.quantity} ${l.unit})`).join(", ") ||
                      "General Stock"}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Taken by: <span className="font-medium text-slate-800">{entry.takenBy}</span> •{" "}
                    {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    entry.status === "CLOSED"
                      ? "bg-slate-100 text-slate-700"
                      : entry.status === "RECONCILED" || entry.status === "DISCREPANCY_APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : entry.status === "DISCREPANCY_PENDING"
                      ? "bg-red-100 text-red-800"
                      : entry.status === "DISPATCHED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {entry.status}
                </span>
              </div>

              {/* Purpose & Stats */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Purpose: </span>
                  {entry.purpose}
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400">Dispatched:</span>{" "}
                    <span className="font-bold text-slate-800">{entry.totalDispatchedQty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Reconciled:</span>{" "}
                    <span className="font-bold text-emerald-700">{entry.totalReconciledQty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Discrepancy:</span>{" "}
                    <span
                      className={`font-bold ${
                        entry.totalDiscrepancyQty > 0 ? "text-red-600" : "text-slate-700"
                      }`}
                    >
                      {entry.totalDiscrepancyQty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discrepancy Notice */}
              {entry.hasDiscrepancy && (
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-xs text-red-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Quantity Discrepancy: {entry.totalDiscrepancyQty} Units</p>
                    <p className="mt-0.5 text-[11px]">
                      {entry.discrepancyReason || "Requires written explanation and Superadmin sign-off before closure."}
                    </p>
                    {entry.status === "DISCREPANCY_PENDING" && (
                      <button
                        onClick={() => {
                          setSelectedEntry(entry);
                          setShowApprovalModal(true);
                        }}
                        className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 active:bg-red-800 text-white rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Sign-off Discrepancy (Superadmin)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">Staff: {entry.responsibleStaff?.name}</span>

                <div className="flex items-center gap-2">
                  {entry.status === "DRAFT" && (
                    <button
                      onClick={() => handleDispatch(entry)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Physical Dispatch</span>
                    </button>
                  )}

                  {(entry.status === "DISPATCHED" ||
                    entry.status === "DISCREPANCY_PENDING" ||
                    entry.status === "REOPENED") && (
                    <button
                      onClick={() => openReconciliation(entry)}
                      className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      Reconcile Dispositions
                    </button>
                  )}

                  {/* Accept return to stock */}
                  {entry.reconciliations?.some(
                    (r) => r.disposition === "RETURNED_TO_STOCK" && !r.isReturnProcessed
                  ) && (
                    <button
                      onClick={() => {
                        const rItem = entry.reconciliations.find(
                          (r) => r.disposition === "RETURNED_TO_STOCK" && !r.isReturnProcessed
                        );
                        if (rItem) {
                          setSelectedEntry(entry);
                          setReturnReconId(rItem.id);
                          setReturnQty(rItem.quantity);
                          setShowReturnModal(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Receive Return</span>
                    </button>
                  )}

                  {/* Close Outward Entry */}
                  {(entry.status === "RECONCILED" || entry.status === "DISCREPANCY_APPROVED") && (
                    <button
                      onClick={() => handleClose(entry)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Close Outward</span>
                    </button>
                  )}

                  {/* Reopen Closed Entry */}
                  {entry.status === "CLOSED" && (
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setShowReopenModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Reopen</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-slate-900 text-base">New Inventory Outward Draft</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOutward} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Storage Location</label>
                <select
                  value={formSourceLoc}
                  onChange={(e) => setFormSourceLoc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Person Taking Goods (Receiver)</label>
                <input
                  type="text"
                  value={formTakenBy}
                  onChange={(e) => setFormTakenBy(e.target.value)}
                  placeholder="e.g. Ramesh (Driver), Sunil (Technician)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose (Free text)</label>
                <textarea
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="e.g. Delivery for Patna Central wholesale route, site work at hotel"
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              {/* Product Lines */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Product Line Items</label>
                  <button
                    type="button"
                    onClick={() => setFormLines([...formLines, { productId: "", quantity: 1 }])}
                    className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {formLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={line.productId}
                      onChange={(e) => {
                        const next = [...formLines];
                        next[idx].productId = e.target.value;
                        setFormLines(next);
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      required
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => {
                        const next = [...formLines];
                        next[idx].quantity = parseInt(e.target.value) || 1;
                        setFormLines(next);
                      }}
                      className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      required
                    />

                    {formLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormLines(formLines.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                  Create Outward Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE MODAL */}
      {showReconcileModal && selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Reconcile Quantities</h2>
                <p className="text-xs text-slate-500">{selectedEntry.outwardNumber} (Dispatched: {selectedEntry.totalDispatchedQty} units)</p>
              </div>
              <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReconciliation} className="space-y-4 text-xs">
              <div className="space-y-3">
                {reconDispositions.map((disp, idx) => {
                  const product = products.find((p) => p.id === disp.productId);
                  return (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{product?.name || "Product"}</span>
                        {reconDispositions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setReconDispositions(reconDispositions.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Disposition</label>
                          <select
                            value={disp.disposition}
                            onChange={(e) => {
                              const next = [...reconDispositions];
                              next[idx].disposition = e.target.value;
                              setReconDispositions(next);
                            }}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <option value="SOLD">SOLD</option>
                            <option value="TRANSFERRED">TRANSFERRED</option>
                            <option value="RETURNED_TO_STOCK">RETURNED TO STOCK</option>
                            <option value="CONSUMED">CONSUMED</option>
                            <option value="DAMAGED">DAMAGED</option>
                            <option value="OTHER">OTHER (Requires Note)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Quantity</label>
                          <input
                            type="number"
                            min={0}
                            value={disp.quantity}
                            onChange={(e) => {
                              const next = [...reconDispositions];
                              next[idx].quantity = parseInt(e.target.value) || 0;
                              setReconDispositions(next);
                            }}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            required
                          />
                        </div>
                      </div>

                      {disp.disposition === "OTHER" && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Explanation</label>
                          <input
                            type="text"
                            value={disp.notes}
                            onChange={(e) => {
                              const next = [...reconDispositions];
                              next[idx].notes = e.target.value;
                              setReconDispositions(next);
                            }}
                            placeholder="Mandatory explanation for OTHER..."
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Disposition row button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedEntry.lines.length > 0) {
                    setReconDispositions([
                      ...reconDispositions,
                      {
                        productId: selectedEntry.lines[0].productId,
                        disposition: "RETURNED_TO_STOCK",
                        quantity: 0,
                        notes: "",
                      },
                    ]);
                  }
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Disposition Line</span>
              </button>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-xl font-semibold shadow"
                >
                  Save Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {showApprovalModal && selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-slate-900 text-base">Authorize Outward Discrepancy</h2>
              <button onClick={() => setShowApprovalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveDiscrepancy} className="space-y-3 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900">
                <p className="font-semibold">Unaccounted Discrepancy: {selectedEntry.totalDiscrepancyQty} Units</p>
                <p className="text-[11px] mt-0.5">
                  Self-approval is rejected by default. Approver sign-off is logged immutably.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mandatory Written Reason</label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder="e.g. Authorized transit loss / breakage audited on 12 Oct 2026."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-semibold shadow"
                >
                  Sign & Authorize Discrepancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {showReturnModal && selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-slate-900 text-base">Accept Physical Return to Stock</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Physically inspect and accept goods returned from {selectedEntry.outwardNumber}. This credits inventory at most once.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Return Location</label>
                <select
                  value={returnLocId}
                  onChange={(e) => setReturnLocId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Accepted Return Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-semibold shadow"
                >
                  Credit to Stock Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-slate-900 text-base">Reopen Closed Outward Entry</h2>
              <button onClick={() => setShowReopenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopen} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Reopening {selectedEntry.outwardNumber} requires a mandatory reason and explicit Superadmin authorization.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Reopening</label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Audited discrepancy correction requested by management..."
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
                  Reopen Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
