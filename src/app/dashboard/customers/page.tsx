"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  IndianRupee,
  Plus,
  Phone,
  MessageSquare,
  Building2,
  Tag,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
  MapPin,
  ShieldCheck,
  Eye,
  Edit2,
  Trash2,
  Mail,
  Calendar,
} from "lucide-react";

interface Customer {
  id: string;
  customerCode?: string;
  name: string;
  contactPerson?: string | null;
  phone: string;
  email?: string | null;
  customerType: string;
  outstandingBalance: number | string;
  totalOrdersCount?: number;
  billingAddress?: string | null;
  gstin?: string | null;
  priceList?: {
    name: string;
    tier: string;
  } | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detail Modal State
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Edit Customer Modal State
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCustomerType, setEditCustomerType] = useState("DISTRIBUTOR");
  const [editGstin, setEditGstin] = useState("");
  const [editBillingAddress, setEditBillingAddress] = useState("");
  const [updating, setUpdating] = useState(false);

  // New Customer Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerType, setCustomerType] = useState("DISTRIBUTOR");
  const [gstin, setGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await fetch("/api/customers?limit=100");
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.customers) ? json.customers : [];
      setCustomers(list);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load live customers from database." });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      setMessage({ type: "error", text: "Contact number must be exactly 10 digits." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const formattedPhone = `+91${digitsOnly}`;
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contactPerson: contactPerson.trim() || null,
          phone: formattedPhone,
          email: email.trim() || null,
          customerType,
          gstin: gstin.trim().toUpperCase() || null,
          billingAddress: billingAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      setMessage({ type: "success", text: `Customer "${name}" created successfully!` });
      setShowModal(false);
      setName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setGstin("");
      setBillingAddress("");
      fetchCustomers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(c: Customer) {
    setEditCustomer(c);
    setEditName(c.name || "");
    setEditContactPerson(c.contactPerson || "");
    setEditPhone((c.phone || "").replace(/^\+91/, ""));
    setEditEmail(c.email || "");
    setEditCustomerType(c.customerType || "DISTRIBUTOR");
    setEditGstin(c.gstin || "");
    setEditBillingAddress(c.billingAddress || "");
    setDetailCustomer(null);
  }

  async function handleUpdateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!editCustomer) return;
    const digitsOnly = editPhone.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      setMessage({ type: "error", text: "Contact number must be exactly 10 digits." });
      return;
    }
    setUpdating(true);
    setMessage(null);
    try {
      const formattedPhone = `+91${digitsOnly}`;
      const res = await fetch(`/api/customers/${editCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          contactPerson: editContactPerson.trim() || null,
          phone: formattedPhone,
          email: editEmail.trim() || null,
          customerType: editCustomerType,
          gstin: editGstin.trim().toUpperCase() || null,
          billingAddress: editBillingAddress.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      setMessage({ type: "success", text: `Customer "${editName}" updated successfully!` });
      setEditCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteCustomer(c: Customer) {
    if (!confirm(`Are you sure you want to remove customer "${c.name}"?`)) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete customer");
      setMessage({ type: "success", text: `Customer "${c.name}" removed successfully!` });
      setDetailCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  }

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(term)) ||
      (c.billingAddress && c.billingAddress.toLowerCase().includes(term));
    const matchesTab = activeTab === "ALL" || c.customerType === activeTab;
    return matchesSearch && matchesTab;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-700" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Customer Directory & Price Tier Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Superadmin Master Customer CRM: stockists, distributors, wholesale & institutional accounts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Customer</span>
        </button>
      </div>

      {/* Executive KPI Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Accounts</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 mt-1 block">{customers.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">Active CRM accounts</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">B2B & Wholesale</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 mt-1 block">
              {customers.filter((c) => c.customerType === "WHOLESALE" || c.customerType === "DISTRIBUTOR").length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Stockists & partners</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Outstanding Due</span>
            <span className="text-2xl font-bold tracking-tight text-rose-600 mt-1 block font-mono">
              ₹{customers.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Pending receivables</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Direct & Corporate</span>
            <span className="text-2xl font-bold tracking-tight text-slate-900 mt-1 block">
              {customers.filter((c) => c.customerType === "RETAIL" || c.customerType === "CORPORATE").length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Institutional clients</span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search, Filter Tabs & View Mode Switcher */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone number, address, or customer code..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-xs"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Category Filter Pills with counts */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { key: "ALL", label: "All Accounts", count: customers.length },
              { key: "DISTRIBUTOR", label: "Distributor", count: customers.filter(c => c.customerType === "DISTRIBUTOR").length },
              { key: "WHOLESALE", label: "Wholesale", count: customers.filter(c => c.customerType === "WHOLESALE").length },
              { key: "CORPORATE", label: "Corporate", count: customers.filter(c => c.customerType === "CORPORATE").length },
              { key: "RETAIL", label: "Retail", count: customers.filter(c => c.customerType === "RETAIL").length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.key ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shrink-0 shadow-xs self-end sm:self-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "grid" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Customers Presentation (Table View or Grid View) */}
      {viewMode === "table" ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading customer records from database...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No customers match your criteria. Click &quot;+ New Customer&quot; to register an account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Customer Name / Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Contact Person & Phone</th>
                    <th className="py-3 px-4">Billing Address & GSTIN</th>
                    <th className="py-3 px-4 text-right">Outstanding Due</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setDetailCustomer(c)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-brand-50 group-hover:text-brand-800 transition-colors">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-brand-800 transition-colors block text-xs">
                              {c.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {c.customerCode || "CUST"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                          c.customerType === "DISTRIBUTOR"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : c.customerType === "WHOLESALE"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : c.customerType === "CORPORATE"
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {c.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 block">{c.phone}</span>
                          {c.contactPerson && (
                            <span className="text-[11px] text-slate-400 block">{c.contactPerson}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          {c.billingAddress ? (
                            <span className="text-slate-600 truncate block text-[11px]">{c.billingAddress}</span>
                          ) : (
                            <span className="text-slate-300 italic text-[11px]">No address</span>
                          )}
                          {c.gstin && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">
                              GST: {c.gstin}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold font-mono text-xs ${
                          Number(c.outstandingBalance || 0) > 0 ? "text-rose-600" : "text-slate-800"
                        }`}>
                          ₹{Number(c.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`tel:${c.phone}`}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setDetailCustomer(c)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-400 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Customer Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
            Loading customers from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No customers match the search criteria. Click &quot;+ New Customer&quot; to add one.
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setDetailCustomer(c)}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-brand-400 hover:shadow-md cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {c.customerCode || "CUST"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.customerType === "DISTRIBUTOR"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.customerType === "CORPORATE"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {c.customerType}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-1.5">{c.name}</h3>
                  {c.contactPerson && (
                    <p className="text-xs text-slate-500">Contact: {c.contactPerson}</p>
                  )}
                  {c.billingAddress && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.billingAddress}</span>
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">Outstanding Due</span>
                  <span className="text-base font-black text-slate-900">
                    ₹{Number(c.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {c.gstin && (
                <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                  GSTIN: {c.gstin}
                </div>
              )}

              {/* Quick Contact & Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailCustomer(c)}
                    className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(c)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                    title="Call Customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-xs font-semibold text-brand-700 hidden sm:inline">
                    {c.phone}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* CREATE NEW CUSTOMER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Register New Customer</h3>
                <p className="text-xs text-slate-500">Superadmin Master Client Directory</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Business Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nalanda Deep Clean Services"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact No. <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100 transition-all overflow-hidden">
                    <div className="flex items-center gap-1 px-2.5 py-2.5 bg-slate-100 border-r border-slate-200 text-slate-700 font-bold select-none text-xs shrink-0">
                      <span className="text-xs">🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length === 12 && val.startsWith("91")) {
                          val = val.slice(2);
                        } else if (val.length === 11 && val.startsWith("0")) {
                          val = val.slice(1);
                        }
                        setPhone(val.slice(0, 10));
                      }}
                      placeholder="9876543210"
                      className="w-full py-2.5 px-3 bg-transparent text-xs tracking-wider font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                    />
                    <div className="pr-2.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                          phone.length === 10
                            ? "bg-emerald-100 text-emerald-700"
                            : phone.length > 0
                            ? "bg-amber-100 text-amber-700"
                            : "text-slate-400"
                        }`}
                      >
                        {phone.length}/10
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Prefix +91 default. Enter 10-digit mobile number.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Category / Tier</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  >
                    <option value="DISTRIBUTOR">DISTRIBUTOR (Super Stockist)</option>
                    <option value="WHOLESALE">WHOLESALE</option>
                    <option value="CORPORATE">CORPORATE (Institutional)</option>
                    <option value="RETAIL">RETAIL</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 10XXXXX0000X1Z5"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@domain.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing / Delivery Address</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="e.g. Bihar Sharif, Nalanda, Bihar"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {saving ? "Registering..." : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL VIEW MODAL */}
      {detailCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-brand-50 text-brand-700 rounded-2xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{detailCustomer.name}</h3>
                  <span className="text-[11px] font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded font-semibold">
                    {detailCustomer.customerCode || "CUST"} • {detailCustomer.customerType}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Outstanding Balance</span>
                  <span className="text-xl font-black text-slate-900">
                    ₹{Number(detailCustomer.outstandingBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${detailCustomer.phone}`}
                    className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Phone className="w-4 h-4 text-brand-600" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${detailCustomer.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Contact Person</span>
                  <p className="font-semibold text-slate-800">{detailCustomer.contactPerson || "Not specified"}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Phone Number</span>
                  <p className="font-semibold text-slate-800">{detailCustomer.phone}</p>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Email Address</span>
                <p className="font-semibold text-slate-800">{detailCustomer.email || "No email on record"}</p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Billing Address</span>
                <p className="font-semibold text-slate-800 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{detailCustomer.billingAddress || "No address on record"}</span>
                </p>
              </div>

              {detailCustomer.gstin && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">GSTIN</span>
                  <p className="font-mono font-bold text-slate-800">{detailCustomer.gstin}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDeleteCustomer(detailCustomer)}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Customer</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailCustomer(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium text-xs hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(detailCustomer)}
                  className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Customer Profile</h3>
                <p className="text-xs text-slate-500">Update client details and commercial records</p>
              </div>
              <button onClick={() => setEditCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Business Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact No. (10 Digits) *</label>
                  <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-brand-600 focus-within:bg-white transition-all overflow-hidden">
                    <div className="flex items-center gap-1 px-2.5 py-2.5 bg-slate-100 border-r border-slate-200 text-slate-700 font-bold select-none text-xs shrink-0">
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full p-2 bg-transparent text-xs focus:outline-none font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Type</label>
                  <select
                    value={editCustomerType}
                    onChange={(e) => setEditCustomerType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="DISTRIBUTOR">DISTRIBUTOR (Stockist)</option>
                    <option value="WHOLESALE">WHOLESALE</option>
                    <option value="CORPORATE">CORPORATE (Institutional)</option>
                    <option value="RETAIL">RETAIL</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing / Delivery Address</label>
                <input
                  type="text"
                  value={editBillingAddress}
                  onChange={(e) => setEditBillingAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
