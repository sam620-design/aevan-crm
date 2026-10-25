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
  Eye,
  Edit2,
  Trash2,
  Building,
  Phone,
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

  // Detail Modal State
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Edit Modal State
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editDeliveryAddress, setEditDeliveryAddress] = useState("");
  const [editDeliveryDate, setEditDeliveryDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(false);

  // Delete Confirm State
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

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

  const handleOpenEditOrder = (order: Order) => {
    setEditOrder(order);
    setEditDeliveryAddress((order as any).deliveryAddress || "");
    setEditDeliveryDate(
      order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split("T")[0] : ""
    );
    setEditNotes((order as any).notes || "");
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrder) return;
    setUpdatingOrder(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${editOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddress: editDeliveryAddress || null,
          expectedDeliveryDate: editDeliveryDate || null,
          notes: editNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");

      setSuccessMsg(`Order "${editOrder.orderNumber}" updated successfully.`);
      setEditOrder(null);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    setDeletingOrder(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/orders/${deleteConfirmOrder.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete order");

      setSuccessMsg(data.message || `Order "${deleteConfirmOrder.orderNumber}" deleted successfully.`);
      setDeleteConfirmOrder(null);
      if (detailOrder?.id === deleteConfirmOrder.id) {
        setDetailOrder(null);
      }
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeletingOrder(false);
    }
  };

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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailOrder(o)}
                    className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    title="View full order details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>

                  {!o.resultingSale && (
                    <>
                      <button
                        onClick={() => handleOpenEditOrder(o)}
                        className="px-2.5 py-1.5 text-xs text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        title="Edit order"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmOrder(o)}
                        className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        title="Delete order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
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

      {/* ORDER DETAIL MODAL */}
      {detailOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>Order: {detailOrder.orderNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailOrder.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : detailOrder.status === "CONFIRMED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {detailOrder.status}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Booked on: {new Date(detailOrder.orderDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetailOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 block font-semibold">Customer</span>
                <span className="font-bold text-slate-900 text-sm">{detailOrder.customer?.name}</span>
                <span className="text-slate-600 block mt-0.5">{detailOrder.customer?.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Exp. Delivery Date</span>
                <span className="font-semibold text-slate-800">
                  {detailOrder.expectedDeliveryDate
                    ? new Date(detailOrder.expectedDeliveryDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
                    : "Not specified"}
                </span>
                {(detailOrder as any).deliveryAddress && (
                  <span className="text-slate-500 block mt-0.5 truncate" title={(detailOrder as any).deliveryAddress}>
                    Address: {(detailOrder as any).deliveryAddress}
                  </span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Order Line Items:</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">Product / Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Tax</th>
                      <th className="p-2.5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailOrder.items?.map((item) => (
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
                <span className="font-mono">₹{Number(detailOrder.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(detailOrder.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{Number(detailOrder.discount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST Tax:</span>
                <span className="font-mono">₹{Number(detailOrder.tax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {Number(detailOrder.deliveryCharges) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charges:</span>
                  <span className="font-mono">₹{Number(detailOrder.deliveryCharges).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-brand-900">
                  ₹{Number(detailOrder.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Linked Sale */}
            {detailOrder.resultingSale && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Converted to Sale: {detailOrder.resultingSale.saleNumber}
                  {detailOrder.resultingSale.invoiceNumber ? ` (${detailOrder.resultingSale.invoiceNumber})` : " (Draft)"}
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                {!detailOrder.resultingSale && (
                  <>
                    <button
                      onClick={() => {
                        const o = detailOrder;
                        setDetailOrder(null);
                        handleConvertOrderToSale(o);
                      }}
                      className="px-3.5 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Create Sale
                    </button>
                    <button
                      onClick={() => {
                        const o = detailOrder;
                        setDetailOrder(null);
                        handleOpenEditOrder(o);
                      }}
                      className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Order
                    </button>
                    <button
                      onClick={() => {
                        const o = detailOrder;
                        setDetailOrder(null);
                        setDeleteConfirmOrder(o);
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
                onClick={() => setDetailOrder(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ORDER MODAL */}
      {editOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Edit Order: {editOrder.orderNumber}</h2>
                  <p className="text-xs text-slate-500">Customer: {editOrder.customer?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => setEditDeliveryDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  value={editDeliveryAddress}
                  onChange={(e) => setEditDeliveryAddress(e.target.value)}
                  placeholder="Street, locality, landmark..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special client requirements, instructions..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditOrder(null)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingOrder}
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {updatingOrder ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ORDER MODAL */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Order?</h3>
                <p className="text-xs text-slate-500">
                  {deleteConfirmOrder.orderNumber} ({deleteConfirmOrder.customer?.name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
              Are you sure you want to delete this order? This action cannot be undone and will be logged in the audit trail.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteConfirmOrder(null)}
                disabled={deletingOrder}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={deletingOrder}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow disabled:opacity-50"
              >
                {deletingOrder ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
