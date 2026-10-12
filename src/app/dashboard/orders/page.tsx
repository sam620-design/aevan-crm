"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  X,
  Package,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  customerCode: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
}

interface OrderItem {
  id: string;
  product: { id: string; name: string; sku: string; unit: string };
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: Customer;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharges: number;
  grandTotal: number;
  status: string;
  resultingSale?: { id: string; saleNumber: string; invoiceNumber?: string; isFinalized: boolean } | null;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
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
      const [ordRes, custRes, prodRes] = await Promise.all([
        fetch("/api/orders").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/customers").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
      ]);

      setOrders(ordRes.data || []);
      setCustomers(custRes.data || []);
      setProducts(prodRes.products || []);
      if (custRes.data?.length > 0) setSelectedCustomerId(custRes.data[0].id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validItems = formItems.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg("Please add at least one product with valid quantity.");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          deliveryAddress: deliveryAddress || null,
          expectedDeliveryDate: deliveryDate || null,
          deliveryCharges: Number(deliveryCharges) || 0,
          notes: notes || null,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      setSuccessMsg(`Order "${data.order.orderNumber}" created successfully. (Order does NOT create an invoice).`);
      setShowCreateModal(false);
      setFormItems([{ productId: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18.0 }]);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleConvertOrderToSale(order: Order) {
    if (!confirm(`Create a separate Sale record from Order "${order.orderNumber}"? (The Order will remain preserved in the system).`)) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/create-sale`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sale");

      setSuccessMsg(`Sale "${data.sale.saleNumber}" successfully created from Order "${order.orderNumber}".`);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl pb-16">
      {/* Alert Notices */}
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Customer Orders (Incoming)
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Incoming demand & pre-sale bookings. Orders are distinct from Sales and never generate invoices.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Order</span>
        </button>
      </div>

      {/* Mandatory Separation Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-emerald-950">
          <FileCheck className="w-4 h-4 text-emerald-700" />
          <span>Mandatory Separation of Orders & Sales:</span>
        </p>
        <p>
          • <strong>Orders represent customer demand:</strong> Creating an Order does not generate an invoice and does not deduct physical stock.
        </p>
        <p>
          • <strong>Separate Sales Workflow:</strong> Authorized users manually click <strong>&quot;Create Sale&quot;</strong> to generate a separate Sales record. The originating Order remains preserved here.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number (ORD-...) or customer name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-600 shadow-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending Confirmation</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Orders List Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            Loading customer orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No orders found. Click &quot;New Order&quot; to create one.
          </div>
        ) : (
          filteredOrders.map((o) => (
            <div
              key={o.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {o.orderNumber}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{o.customer?.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {o.items?.map((i) => `${i.quantity}x ${i.product.name}`).join(", ") || "General Line Items"}
                  </p>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800"
                      : o.status === "CONFIRMED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {o.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px]">Estimated Value: </span>
                  <span className="font-bold text-slate-900">₹{Number(o.grandTotal).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Exp Delivery: </span>
                  <span className="font-medium text-slate-700">
                    {o.expectedDeliveryDate
                      ? new Date(o.expectedDeliveryDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "Not specified"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {o.resultingSale ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Linked Sale: {o.resultingSale.saleNumber}
                      {o.resultingSale.invoiceNumber ? ` (${o.resultingSale.invoiceNumber})` : " (Draft)"}
                    </span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleConvertOrderToSale(o)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <span>Create Sale</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="text-xs text-slate-400">
                  {new Date(o.orderDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">New Customer Order</h2>
                <p className="text-xs text-slate-500">Booking incoming order (Invoice is not generated)</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
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
                  <label className="block font-semibold text-slate-700 mb-1">Exp. Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
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
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Optional delivery address if different from billing..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Order Items */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Order Items</label>
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
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
