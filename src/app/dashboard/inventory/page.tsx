"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Plus,
  ArrowDownToLine,
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  TrendingUp,
  Tag,
  ShieldCheck,
  DollarSign,
  Layers,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";

interface StockBalance {
  id: string;
  quantity: number;
  location: {
    id: string;
    name: string;
    code: string;
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  basePrice: number | string;
  costPrice?: number | string | null;
  taxRate: number | string;
  minStockAlert: number;
  totalPhysicalStock: number;
  stockBalances?: StockBalance[];
}

interface Location {
  id: string;
  name: string;
  code: string;
  address?: string | null;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [marginsVisible, setMarginsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodCategory, setProdCategory] = useState("FORMULATIONS");
  const [prodUnit, setProdUnit] = useState("CAN_5L");
  const [prodBasePrice, setProdBasePrice] = useState("");
  const [prodCostPrice, setProdCostPrice] = useState("");
  const [prodTaxRate, setProdTaxRate] = useState("18");
  const [prodMinAlert, setProdMinAlert] = useState("10");
  const [savingProduct, setSavingProduct] = useState(false);

  // New Location Modal (Superadmin feature)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // Detail Modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Edit Product Modal
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState("");
  const [editProdCategory, setEditProdCategory] = useState("FORMULATIONS");
  const [editProdUnit, setEditProdUnit] = useState("CAN_5L");
  const [editProdBasePrice, setEditProdBasePrice] = useState("");
  const [editProdCostPrice, setEditProdCostPrice] = useState("");
  const [editProdTaxRate, setEditProdTaxRate] = useState("18");
  const [editProdMinAlert, setEditProdMinAlert] = useState("10");
  const [updatingProduct, setUpdatingProduct] = useState(false);

  // Delete Confirm
  const [deleteProductItem, setDeleteProductItem] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [prodRes, locRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/locations").then((r) => r.json()),
      ]);

      const prods = Array.isArray(prodRes?.products)
        ? prodRes.products
        : Array.isArray(prodRes?.data)
        ? prodRes.data
        : [];
      setProducts(prods);
      setMarginsVisible(Boolean(prodRes?.marginsVisible));

      const locs = Array.isArray(locRes?.locations) ? locRes.locations : [];
      setLocations(locs);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load live inventory data." });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    setMessage(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prodName,
          sku: prodSku.trim().toUpperCase(),
          category: prodCategory,
          unit: prodUnit,
          basePrice: parseFloat(prodBasePrice) || 0,
          costPrice: prodCostPrice ? parseFloat(prodCostPrice) : null,
          taxRate: parseFloat(prodTaxRate) || 18,
          minStockAlert: parseInt(prodMinAlert) || 10,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      setMessage({ type: "success", text: `Product "${prodName}" (${prodSku}) created successfully!` });
      setShowProductModal(false);
      setProdName("");
      setProdSku("");
      setProdBasePrice("");
      setProdCostPrice("");
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleCreateLocation(e: React.FormEvent) {
    e.preventDefault();
    setSavingLocation(true);
    setMessage(null);

    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: locName,
          code: locCode.trim().toUpperCase(),
          address: locAddress || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create location");

      setMessage({ type: "success", text: `Facility location "${locName}" created successfully!` });
      setShowLocationModal(false);
      setLocName("");
      setLocCode("");
      setLocAddress("");
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingLocation(false);
    }
  }

  const handleOpenEditProduct = (item: Product) => {
    setEditProduct(item);
    setEditProdName(item.name || "");
    setEditProdCategory(item.category || "FORMULATIONS");
    setEditProdUnit(item.unit || "CAN_5L");
    setEditProdBasePrice(String(item.basePrice || ""));
    setEditProdCostPrice(item.costPrice !== null && item.costPrice !== undefined ? String(item.costPrice) : "");
    setEditProdTaxRate(String(item.taxRate || "18"));
    setEditProdMinAlert(String(item.minStockAlert || "10"));
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    setUpdatingProduct(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProdName,
          category: editProdCategory,
          unit: editProdUnit,
          basePrice: parseFloat(editProdBasePrice) || 0,
          costPrice: editProdCostPrice ? parseFloat(editProdCostPrice) : null,
          taxRate: parseFloat(editProdTaxRate) || 18,
          minStockAlert: parseInt(editProdMinAlert) || 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");
      setMessage({ type: "success", text: `Product "${editProdName}" updated successfully!` });
      setEditProduct(null);
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductItem) return;
    setDeletingProduct(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${deleteProductItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");
      setMessage({ type: "success", text: data.message || "Product deleted or deactivated." });
      setDeleteProductItem(null);
      if (detailProduct?.id === deleteProductItem.id) {
        setDetailProduct(null);
      }
      fetchData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDeletingProduct(false);
    }
  };

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term);
    const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Calculate high level metrics
  const totalStockUnits = products.reduce((sum, p) => sum + (p.totalPhysicalStock || 0), 0);
  const totalValuation = products.reduce(
    (sum, p) => sum + (p.totalPhysicalStock || 0) * (Number(p.basePrice) || 0),
    0
  );
  const totalCostValuation = products.reduce(
    (sum, p) => sum + (p.totalPhysicalStock || 0) * (Number(p.costPrice) || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-700" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Inventory & Physical Stock Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time physical stock balances, multi-location facilities, and cost/margin intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLocationModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>+ New Facility</span>
          </button>

          <Link
            href="/dashboard/purchases/receiving"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-semibold shadow transition-all"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Goods Inward (GRN)</span>
          </Link>

          <button
            onClick={() => setShowProductModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ New SKU</span>
          </button>
        </div>
      </div>

      {/* Superadmin Full Authority Confirmation Banner */}
      <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-emerald-950">
              Root Authority: 100% Unlocked Inventory & Financial Control
            </h2>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Cost prices, profit margins, and warehouse allocation are fully unlocked for your account. No special permissions required.
            </p>
          </div>
        </div>

        {marginsVisible && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-200/80 text-emerald-900 rounded-full text-[11px] font-black shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Profit Margins Active</span>
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Inventory Units</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {totalStockUnits.toLocaleString()} units
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Across {products.length} active SKU(s)</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Retail Stock Valuation</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹{totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">At base selling prices</p>
        </div>

        {marginsVisible && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Procurement Cost Value</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              ₹{totalCostValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Calculated at supplier cost</p>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Locations</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {locations.length} Facilit{locations.length === 1 ? "y" : "ies"}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {locations.map((l) => l.code).join(", ") || "Central Facilities"}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, formulation name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-600 shadow-sm"
          >
            <option value="ALL">All Facilities & Warehouses</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-600 shadow-sm"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Products List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
            Connecting to PostgreSQL and fetching real-time stock balances...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No products match the filter. Click &quot;+ New SKU&quot; to add a formulation.
          </div>
        ) : (
          filtered.map((item) => {
            const isLow = (item.totalPhysicalStock || 0) <= (item.minStockAlert || 10);
            const cost = Number(item.costPrice) || 0;
            const base = Number(item.basePrice) || 0;
            const grossProfit = base - cost;
            const marginPct = base > 0 && cost > 0 ? ((grossProfit / base) * 100).toFixed(1) : null;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {item.sku}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Unit: {item.unit}
                      </span>
                    </div>
                    <h2 className="font-bold text-slate-900 text-sm sm:text-base mt-1.5">
                      {item.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLow ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 flex items-center gap-1 border border-red-200">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock Alert (&le; {item.minStockAlert})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Stock Healthy
                      </span>
                    )}
                  </div>
                </div>

                {/* Pricing & Unlocked Profit Margins row */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Retail Price</span>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{base.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {marginsVisible && (
                      <>
                        <div className="border-l border-slate-200 pl-4">
                          <span className="text-emerald-700 text-[10px] uppercase font-bold block">
                            Cost Price (Superadmin Unlocked)
                          </span>
                          <span className="text-sm font-bold text-emerald-800">
                            ₹{cost > 0 ? cost.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "N/A"}
                          </span>
                        </div>

                        {cost > 0 && (
                          <div className="border-l border-slate-200 pl-4">
                            <span className="text-indigo-700 text-[10px] uppercase font-bold block">
                              Gross Margin
                            </span>
                            <span className="text-sm font-bold text-indigo-900">
                              +₹{grossProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              {marginPct && ` (${marginPct}%)`}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Physical Stock</span>
                    <span className="text-lg font-black text-slate-900">
                      {item.totalPhysicalStock || 0} {item.unit}
                    </span>
                  </div>
                </div>

                {/* Warehouse breakdown */}
                {item.stockBalances && item.stockBalances.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 font-medium">Facility Breakdown:</span>
                    {item.stockBalances.map((b) => (
                      <span
                        key={b.id}
                        className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center gap-1.5"
                      >
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{b.location?.name || "Warehouse"}: </span>
                        <strong className="text-slate-900">{b.quantity}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    Tax: {item.taxRate}% | Min Alert: {item.minStockAlert}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDetailProduct(item)}
                      className="px-2.5 py-1 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Details
                    </button>
                    <button
                      onClick={() => handleOpenEditProduct(item)}
                      className="px-2.5 py-1 text-xs text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      title="Edit product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteProductItem(item)}
                      className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      title="Delete / Deactivate product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE NEW PRODUCT / SKU MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Register New Product SKU</h3>
                <p className="text-xs text-slate-500">Superadmin Master Product Catalog Entry</p>
              </div>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Formulation Name</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. GOOD TOUCH Lemon Floor Cleaner (5L)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="e.g. GT-FC-5L"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="e.g. FLOOR_CLEANER"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measurement</label>
                  <select
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  >
                    <option value="CAN_5L">Can (5 Liters)</option>
                    <option value="BOTTLE_1L">Bottle (1 Liter)</option>
                    <option value="BOTTLE_500ML">Bottle (500ml)</option>
                    <option value="DRUM_50L">Industrial Drum (50L)</option>
                    <option value="PCS">Pieces (Pcs)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    min={1}
                    value={prodMinAlert}
                    onChange={(e) => setProdMinAlert(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodBasePrice}
                    onChange={(e) => setProdBasePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-800 mb-1">
                    Cost Price (₹) (Unlocked)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {savingProduct ? "Saving SKU..." : "Create Product SKU"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW FACILITY LOCATION MODAL (SUPERADMIN ONLY) */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Facility / Warehouse</h3>
                <p className="text-xs text-slate-500">Root Superadmin Facility Authorization</p>
              </div>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="e.g. Patna Depot Warehouse"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Code</label>
                <input
                  type="text"
                  required
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  placeholder="e.g. LOC-PATNA-01"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Region</label>
                <input
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="e.g. Transport Nagar, Patna, Bihar"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {savingLocation ? "Creating..." : "Authorize Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL MODAL */}
      {detailProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <Package className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{detailProduct.name}</h3>
                  <span className="text-xs font-mono font-bold text-slate-500">{detailProduct.sku}</span>
                </div>
              </div>
              <button onClick={() => setDetailProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">Category</span>
                  <span className="font-bold text-slate-800">{detailProduct.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Unit Type</span>
                  <span className="font-bold text-slate-800">{detailProduct.unit}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 border border-slate-100 rounded-xl bg-white shadow-xs">
                  <span className="text-slate-400 block font-semibold">Base Price</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number(detailProduct.basePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 border border-slate-100 rounded-xl bg-white shadow-xs">
                  <span className="text-slate-400 block font-semibold">GST Tax Rate</span>
                  <span className="font-bold text-slate-900">{detailProduct.taxRate}%</span>
                </div>
                <div className="p-2.5 border border-slate-100 rounded-xl bg-white shadow-xs">
                  <span className="text-slate-400 block font-semibold">Min Alert</span>
                  <span className="font-bold text-amber-700">{detailProduct.minStockAlert} units</span>
                </div>
              </div>

              {marginsVisible && detailProduct.costPrice !== null && detailProduct.costPrice !== undefined && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-emerald-800 font-bold block">Profit Margin Analysis</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-emerald-600 block text-[11px]">Cost Price:</span>
                      <strong className="text-emerald-950 font-mono">
                        ₹{Number(detailProduct.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-600 block text-[11px]">Gross Margin:</span>
                      <strong className="text-emerald-950 font-mono">
                        ₹{(Number(detailProduct.basePrice) - Number(detailProduct.costPrice)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-500 font-bold block mb-1.5">Warehouse Stock Distribution:</span>
                {detailProduct.stockBalances && detailProduct.stockBalances.length > 0 ? (
                  <div className="space-y-1.5">
                    {detailProduct.stockBalances.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <span className="font-medium text-slate-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {b.location?.name} ({b.location?.code})
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {b.quantity} {detailProduct.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No facility stock records allocated yet.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const p = detailProduct;
                    setDetailProduct(null);
                    handleOpenEditProduct(p);
                  }}
                  className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit SKU
                </button>
                <button
                  onClick={() => {
                    const p = detailProduct;
                    setDetailProduct(null);
                    setDeleteProductItem(p);
                  }}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
              <button
                onClick={() => setDetailProduct(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Product: {editProduct.sku}</h3>
                  <p className="text-xs text-slate-500">Update pricing, tax, alert threshold, or classification</p>
                </div>
              </div>
              <button onClick={() => setEditProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Formulation Name *</label>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editProdCategory}
                    onChange={(e) => setEditProdCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="FORMULATIONS">Chemical Formulations</option>
                    <option value="EQUIPMENT">Machinery & Tools</option>
                    <option value="CONSUMABLES">Consumables / Towels</option>
                    <option value="SERVICES">Service Packs</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Packaging / Unit</label>
                  <select
                    value={editProdUnit}
                    onChange={(e) => setEditProdUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="CAN_5L">5-Liter Jerry Can (CAN_5L)</option>
                    <option value="BOTTLE_1L">1-Liter Spray Bottle (BOTTLE_1L)</option>
                    <option value="DRUM_50L">50-Liter Industrial Drum (DRUM_50L)</option>
                    <option value="PCS">Individual Piece (PCS)</option>
                    <option value="PACK">Bulk Pack (PACK)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editProdBasePrice}
                    onChange={(e) => setEditProdBasePrice(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cost Price (₹) <span className="text-emerald-700 font-bold">(Superadmin)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editProdCostPrice}
                    onChange={(e) => setEditProdCostPrice(e.target.value)}
                    placeholder="Optional cost"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={editProdTaxRate}
                    onChange={(e) => setEditProdTaxRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% (Essential Consumables)</option>
                    <option value="12">12% (Standard)</option>
                    <option value="18">18% (Standard Chemicals)</option>
                    <option value="28">28% (Heavy Machinery)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Low Stock Alert Min Threshold</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editProdMinAlert}
                    onChange={(e) => setEditProdMinAlert(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProduct}
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {updatingProduct ? "Saving..." : "Save Product Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
      {deleteProductItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Product?</h3>
                <p className="text-xs text-slate-500">
                  {deleteProductItem.name} ({deleteProductItem.sku})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
              Are you sure you want to delete this product? If the product has historical sales or purchase orders, it will be safely deactivated to preserve your financial ledgers.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteProductItem(null)}
                disabled={deletingProduct}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deletingProduct}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow disabled:opacity-50"
              >
                {deletingProduct ? "Processing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
