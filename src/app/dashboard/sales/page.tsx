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
  UserPlus,
  Phone,
  Check,
} from "lucide-react";

interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  contactPerson?: string | null;
  phone: string;
  customerType?: string;
  billingAddress?: string | null;
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

  // Customer search & inline creation state
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustContactPerson, setNewCustContactPerson] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustType, setNewCustType] = useState("RETAIL");
  const [newCustGstin, setNewCustGstin] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [custCreatedSuccess, setCustCreatedSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [saleRes, custRes, prodRes] = await Promise.all([
        fetch("/api/sales").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/customers?limit=200").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/products").then((r) => (r.ok ? r.json() : { products: [] })),
      ]);

      setSales(saleRes.data || []);
      const loadedCusts: Customer[] = custRes.data || [];
      setCustomers(loadedCusts);
      setProducts(prodRes.products || []);
      if (loadedCusts.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(loadedCusts[0].id);
        if (loadedCusts[0].billingAddress) {
          setBillingAddress(loadedCusts[0].billingAddress);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Quick Customer Creation in the same form
  async function handleQuickCreateCustomer(): Promise<string | null> {
    if (!newCustName.trim()) {
      setErrorMsg("Please enter Customer / Company Name.");
      return null;
    }
    const digits = newCustPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setErrorMsg("Contact No. must be exactly 10 digits.");
      return null;
    }

    setSavingCustomer(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName.trim(),
          contactPerson: newCustContactPerson.trim() || null,
          phone: `+91${digits}`,
          customerType: newCustType,
          billingAddress: newCustAddress.trim() || null,
          gstin: newCustGstin.trim().toUpperCase() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      const created: Customer = data.customer;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomerId(created.id);
      if (created.billingAddress) {
        setBillingAddress(created.billingAddress);
      }
      setIsCreatingCustomer(false);
      setCustCreatedSuccess(`Created & selected: ${created.name} (${created.customerCode || ""})`);
      setNewCustName("");
      setNewCustContactPerson("");
      setNewCustPhone("");
      setNewCustGstin("");
      setNewCustAddress("");
      return created.id;
    } catch (err: any) {
      setErrorMsg(err.message);
      return null;
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleCreateDirectSale(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let targetCustomerId = selectedCustomerId;

    // If currently creating a new customer inline, complete customer creation first
    if (isCreatingCustomer) {
      const createdId = await handleQuickCreateCustomer();
      if (!createdId) return; // Validation or creation failed
      targetCustomerId = createdId;
    }

    if (!targetCustomerId) {
      setErrorMsg("Please select or create a customer for this direct sale.");
      return;
    }

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
          customerId: targetCustomerId,
          billingAddress: billingAddress || null,
          deliveryCharges: Number(deliveryCharges) || 0,
          notes: notes || null,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create direct sale");

      setSuccessMsg(`Direct Sale "${data.sale.saleNumber}" created successfully. Review and finalize to issue invoice.`);
      setShowCreateModal(false);
      setIsCreatingCustomer(false);
      setCustomerSearchQuery("");
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

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchQuery.trim()) return true;
    const q = customerSearchQuery.toLowerCase().trim();
    const phoneClean = c.phone.replace(/[^0-9]/g, "");
    const qClean = q.replace(/[^0-9]/g, "");

    const matchesPhone = c.phone.toLowerCase().includes(q) || (qClean.length > 0 && phoneClean.includes(qClean));
    const matchesName = c.name.toLowerCase().includes(q);
    const matchesContact = c.contactPerson ? c.contactPerson.toLowerCase().includes(q) : false;
    const matchesCode = c.customerCode ? c.customerCode.toLowerCase().includes(q) : false;

    return matchesPhone || matchesName || matchesContact || matchesCode;
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
              {/* Customer Selection & Inline Creation Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    <span>Customer / Client</span>
                    <span className="text-red-500">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCustomer(!isCreatingCustomer);
                      setIsCustomerDropdownOpen(false);
                      if (!isCreatingCustomer && customerSearchQuery) {
                        setNewCustName(customerSearchQuery);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all border shadow-sm ${
                      isCreatingCustomer
                        ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                        : "bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-300"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCreatingCustomer ? "Select Existing" : "+ New Customer"}</span>
                  </button>
                </div>

                {custCreatedSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {custCreatedSuccess}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustCreatedSuccess(null)}
                      className="text-emerald-700 p-0.5 hover:text-emerald-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* MODE A: Inline New Customer Registration */}
                {isCreatingCustomer ? (
                  <div className="p-3.5 bg-gradient-to-b from-brand-50/70 to-slate-50 border border-brand-200 rounded-2xl space-y-3 shadow-inner">
                    <div className="flex items-center justify-between border-b border-brand-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-bold">
                          +
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">Register New Customer</h4>
                          <p className="text-[10px] text-slate-500">
                            Saved to directory &amp; linked directly to this sale
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreatingCustomer(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Customer / Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="e.g. Nalanda Deep Clean / Balram Hardware"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Contact No. <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600 overflow-hidden">
                          <div className="flex items-center gap-1 px-2.5 py-2 bg-slate-100 border-r border-slate-200 text-slate-700 font-bold select-none text-[11px] shrink-0">
                            <span>🇮🇳</span>
                            <span>+91</span>
                          </div>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            value={newCustPhone}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "");
                              if (val.length === 12 && val.startsWith("91")) {
                                val = val.slice(2);
                              } else if (val.length === 11 && val.startsWith("0")) {
                                val = val.slice(1);
                              }
                              setNewCustPhone(val.slice(0, 10));
                            }}
                            placeholder="9876543210"
                            className="w-full py-2 px-2.5 bg-transparent text-xs tracking-wider font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                          />
                          <div className="pr-2 shrink-0">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                newCustPhone.length === 10
                                  ? "bg-emerald-100 text-emerald-700"
                                  : newCustPhone.length > 0
                                  ? "bg-amber-100 text-amber-700"
                                  : "text-slate-400"
                              }`}
                            >
                              {newCustPhone.length}/10
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Prefix +91 default. Takes 10 digits.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Contact Person (Optional)
                        </label>
                        <input
                          type="text"
                          value={newCustContactPerson}
                          onChange={(e) => setNewCustContactPerson(e.target.value)}
                          placeholder="e.g. Rajesh Kumar"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Customer Tier
                        </label>
                        <select
                          value={newCustType}
                          onChange={(e) => setNewCustType(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        >
                          <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                          <option value="WHOLESALE">WHOLESALE</option>
                          <option value="CORPORATE">CORPORATE</option>
                          <option value="RETAIL">RETAIL</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          GSTIN (Optional)
                        </label>
                        <input
                          type="text"
                          value={newCustGstin}
                          onChange={(e) => setNewCustGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 10XXXXX0000X1Z5"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Billing Address (Optional)
                        </label>
                        <input
                          type="text"
                          value={newCustAddress}
                          onChange={(e) => {
                            setNewCustAddress(e.target.value);
                            if (!billingAddress) setBillingAddress(e.target.value);
                          }}
                          placeholder="e.g. Bihar Sharif, Nalanda, Bihar"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-brand-100">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCustomer(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Cancel (Select Existing)
                      </button>
                      <button
                        type="button"
                        disabled={savingCustomer}
                        onClick={handleQuickCreateCustomer}
                        className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                      >
                        {savingCustomer ? "Saving..." : "✓ Save & Select Customer"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* MODE B: Search by Phone, Name, or Company Name */
                  <div className="space-y-2">
                    {selectedCustomer && !isCustomerDropdownOpen ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2 hover:border-slate-300 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {selectedCustomer.name}
                            </span>
                            {selectedCustomer.customerCode && (
                              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                {selectedCustomer.customerCode}
                              </span>
                            )}
                            {selectedCustomer.customerType && (
                              <span className="text-[9px] font-semibold bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">
                                {selectedCustomer.customerType}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                            <span className="flex items-center gap-1 font-semibold text-brand-700">
                              <Phone className="w-3 h-3" />
                              {selectedCustomer.phone}
                            </span>
                            {selectedCustomer.contactPerson && (
                              <span className="text-slate-500">
                                Contact: {selectedCustomer.contactPerson}
                              </span>
                            )}
                            {selectedCustomer.gstin && (
                              <span className="font-mono text-slate-500">
                                GSTIN: {selectedCustomer.gstin}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomerDropdownOpen(true);
                            setCustomerSearchQuery("");
                          }}
                          className="text-[11px] font-bold text-brand-700 hover:text-brand-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 shadow-sm"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            autoFocus={isCustomerDropdownOpen}
                            value={customerSearchQuery}
                            onFocus={() => setIsCustomerDropdownOpen(true)}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setIsCustomerDropdownOpen(true);
                            }}
                            placeholder="Search by phone no., customer name, or company name..."
                            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 focus:bg-white focus:ring-1 focus:ring-brand-600 transition-all"
                          />
                          {customerSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setCustomerSearchQuery("")}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown Options */}
                        <div className="mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-20">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500 space-y-1">
                              <p>No customer found matching &quot;{customerSearchQuery}&quot;</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingCustomer(true);
                                  setIsCustomerDropdownOpen(false);
                                  setNewCustName(customerSearchQuery);
                                }}
                                className="text-brand-700 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                              >
                                <Plus className="w-3 h-3" />
                                Click here to create &quot;{customerSearchQuery}&quot; as new customer
                              </button>
                            </div>
                          ) : (
                            filteredCustomers.slice(0, 30).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(c.id);
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchQuery("");
                                  if (c.billingAddress) {
                                    setBillingAddress(c.billingAddress);
                                  }
                                }}
                                className={`w-full text-left p-2.5 hover:bg-brand-50/80 transition-colors flex items-center justify-between gap-2 ${
                                  selectedCustomerId === c.id ? "bg-brand-50" : ""
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {c.name}
                                    </span>
                                    {c.customerCode && (
                                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                                        {c.customerCode}
                                      </span>
                                    )}
                                    {c.customerType && (
                                      <span className="text-[9px] font-semibold text-slate-500">
                                        • {c.customerType}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <span className="font-medium text-brand-700">
                                      📞 {c.phone}
                                    </span>
                                    {c.contactPerson && (
                                      <span>• 👤 {c.contactPerson}</span>
                                    )}
                                    {c.billingAddress && (
                                      <span className="truncate max-w-[180px]">• 📍 {c.billingAddress}</span>
                                    )}
                                  </div>
                                </div>
                                {selectedCustomerId === c.id && (
                                  <Check className="w-4 h-4 text-brand-700 shrink-0" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
