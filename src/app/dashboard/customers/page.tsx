"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

      {/* Search & Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone number, address, or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {["ALL", "DISTRIBUTOR", "WHOLESALE", "CORPORATE", "RETAIL"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-colors ${
                activeTab === tab
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Mobile Cards */}
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
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
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
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                    title="Call Customer"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>

                <span className="text-xs font-semibold text-brand-700">
                  {c.phone}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

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
    </div>
  );
}
