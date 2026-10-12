"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  X,
  Building,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
}

interface SaleItem {
  id: string;
  productName?: string | null;
  sku?: string | null;
  product: { id: string; name: string; sku: string; unit: string };
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  invoiceNumber?: string | null;
  customer: Customer;
  customerName?: string | null;
  saleDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  isFinalized: boolean;
  finalizedAt?: string | null;
  linkedOrder?: { id: string; orderNumber: string } | null;
  items: SaleItem[];
}

interface InvoiceDoc {
  company: { name: string; brand: string; gstin: string; phone: string; email: string; address: string };
  invoiceNumber: string;
  saleNumber: string;
  date: string;
  customer: { name: string; phone: string; gstin?: string; billingAddress?: string };
  items: Array<{ productName: string; sku: string; quantity: number; unitPrice: number; discount: number; taxRate: number; lineTotal: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  termsAndConditions: string;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFinalized, setFilterFinalized] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<InvoiceDoc | null>(null);

  // Direct sale form
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<
    Array<{ productId: string; quantity: number; unitPrice: number; discount: number; taxRate: number }>
  >([{ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18.0 }]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [saleRes, custRes, prodRes] = await Promise.all([
        fetch("/api/sales").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/customers").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
      ]);

      setSales(saleRes.data || []);
      setCustomers(custRes.data || []);
      setProducts(prodRes.products || []);
      if (custRes.data?.length > 0) setSelectedCustomerId(custRes.data[0].id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDirectSale(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validItems = formItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg("Please add at least one product with valid quantity.");
      return;
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          billingAddress: billingAddress || null,
          deliveryCharges: Number(deliveryCharges) || 0,
          notes: notes || null,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create direct sale");

      setSuccessMsg(`Direct Sale "${data.sale.saleNumber}" created. Review and finalize to issue the invoice.`);
      setShowCreateModal(false);
      setFormItems([{ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18.0 }]);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleFinalizeSale(sale: Sale) {
    if (!confirm(`Finalize Sale "${sale.saleNumber}"? This will assign a sequential, permanent Invoice Number.`)) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/sales/${sale.id}/finalize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize sale");

      setSuccessMsg(`Sale "${data.sale.saleNumber}" finalized! Generated Invoice: ${data.sale.invoiceNumber}`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleViewInvoice(saleId: string) {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sales/${saleId}/invoice`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load invoice document");

      setActiveInvoice(data.invoice);
      setShowInvoiceModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  const filteredSales = sales.filter((s) => {
    const matchSearch =
      s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase()));

    const matchFinalized =
      filterFinalized === "ALL" ||
      (filterFinalized === "FINALIZED" && s.isFinalized) ||
      (filterFinalized === "DRAFT" && !s.isFinalized);

    return matchSearch && matchFinalized;
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
            <Receipt className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Sales & Invoicing
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Commercial sales, sequential GST invoice numbers, and print-ready tax invoices.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Direct Sale</span>
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
            placeholder="Search by Invoice (INV-...), Sale ref (SAL-...), or customer name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <select
          value={filterFinalized}
          onChange={(e) => setFilterFinalized(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-600 shadow-sm"
        >
          <option value="ALL">All Sales</option>
          <option value="FINALIZED">Finalized (Invoice Issued)</option>
          <option value="DRAFT">Draft / Unfinalized</option>
        </select>
      </div>

      {/* Sales List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            Loading sales records...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No sales records found. Convert an Order or click &quot;New Direct Sale&quot;.
          </div>
        ) : (
          filteredSales.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {s.invoiceNumber ? (
                      <span className="text-[10px] font-mono font-bold text-brand-900 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                        {s.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {s.saleNumber} (Draft)
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {s.linkedOrder ? `Converted from ${s.linkedOrder.orderNumber}` : "Direct Sale"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{s.customerName || s.customer?.name}</h3>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.isFinalized
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {s.isFinalized ? "FINALIZED" : "DRAFT SALE"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs text-center">
                <div>
                  <p className="text-slate-400 text-[10px]">Subtotal</p>
                  <p className="font-medium text-slate-700">₹{Number(s.subtotal).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Tax (GST)</p>
                  <p className="font-medium text-slate-700">₹{Number(s.tax).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Grand Total</p>
                  <p className="font-bold text-slate-900">₹{Number(s.grandTotal).toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  {new Date(s.saleDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>

                <div className="flex items-center gap-2">
                  {!s.isFinalized ? (
                    <button
                      onClick={() => handleFinalizeSale(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Finalize & Issue Invoice</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleViewInvoice(s.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Tax Invoice</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE DIRECT SALE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">New Direct Sale</h2>
                <p className="text-xs text-slate-500">Create a direct sale without an originating order</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectSale} className="space-y-3 text-xs">
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Billing address for tax invoice..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
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

              {/* Items */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Sale Line Items</label>
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
                  Create Direct Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {showInvoiceModal && activeInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto text-xs">
            {/* Invoice Top Actions */}
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <span className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-700" />
                <span>Tax Invoice Preview</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-xl font-semibold shadow transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-4 bg-white border rounded-xl space-y-4 font-sans text-slate-900">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-lg font-black text-brand-700 tracking-wide">{activeInvoice.company.name}</h2>
                  <p className="text-[11px] font-semibold text-slate-600">Brand: {activeInvoice.company.brand}</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs">{activeInvoice.company.address}</p>
                  <p className="text-[10px] text-slate-500">Phone: {activeInvoice.company.phone} • Email: {activeInvoice.company.email}</p>
                  <p className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">GSTIN: {activeInvoice.company.gstin}</p>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-brand-900 font-mono">{activeInvoice.invoiceNumber}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Date: {new Date(activeInvoice.date).toLocaleDateString("en-IN")}</p>
                  <p className="text-[10px] text-slate-400">Sale Ref: {activeInvoice.saleNumber}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To Customer:</p>
                <h3 className="font-bold text-sm text-slate-900 mt-0.5">{activeInvoice.customer.name}</h3>
                <p className="text-[11px] text-slate-600">Phone: {activeInvoice.customer.phone}</p>
                {activeInvoice.customer.gstin && (
                  <p className="text-[11px] font-mono font-semibold text-slate-800">GSTIN: {activeInvoice.customer.gstin}</p>
                )}
                {activeInvoice.customer.billingAddress && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{activeInvoice.customer.billingAddress}</p>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-1.5">Description</th>
                      <th className="py-1.5 text-center">Qty</th>
                      <th className="py-1.5 text-right">Price</th>
                      <th className="py-1.5 text-right">Disc</th>
                      <th className="py-1.5 text-right">GST%</th>
                      <th className="py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px]">
                    {activeInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2">
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{item.sku}</p>
                        </td>
                        <td className="py-2 text-center font-medium">{item.quantity}</td>
                        <td className="py-2 text-right">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                        <td className="py-2 text-right">₹{item.discount.toLocaleString("en-IN")}</td>
                        <td className="py-2 text-right">{item.taxRate}%</td>
                        <td className="py-2 text-right font-bold text-slate-900">₹{item.lineTotal.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary */}
              <div className="flex justify-end pt-2 border-t">
                <div className="w-64 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Subtotal:</span>
                    <span>₹{activeInvoice.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {activeInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Total Discount:</span>
                      <span>-₹{activeInvoice.discount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>GST (Taxes):</span>
                    <span>₹{activeInvoice.tax.toLocaleString("en-IN")}</span>
                  </div>
                  {activeInvoice.deliveryCharges > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery Charges:</span>
                      <span>₹{activeInvoice.deliveryCharges.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-brand-900 pt-1 border-t border-slate-900">
                    <span>Grand Total:</span>
                    <span>₹{activeInvoice.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="pt-3 border-t text-[10px] text-slate-400">
                <p className="font-semibold text-slate-500">Terms & Conditions:</p>
                <p>{activeInvoice.termsAndConditions}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
