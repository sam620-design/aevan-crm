"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "AEVAN Cleaning",
    brandName: "GOOD TOUCH",
    gstin: "10XXXXX0000X1Z5",
    phone: "+91-7061101285",
    email: "info@aevancleaning.com",
    address: "Nalanda District, Bihar Sharif, Bihar - 803111",
    invoicePrefix: "INV-",
    orderPrefix: "ORD-",
    salePrefix: "SAL-",
    quotationPrefix: "QUO-",
    outwardPrefix: "OUT-",
    paymentPrefix: "PAY-",
    receiptPrefix: "REC-",
    supplierPrefix: "SUP-",
    poPrefix: "PO-",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (res.ok && data.config) {
        setForm((prev) => ({
          ...prev,
          ...data.config,
        }));
      }
    } catch (err: any) {
      setErrorMsg("Failed to load company configuration.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");

      setSuccessMsg("System configuration saved to PostgreSQL database successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl max-w-4xl mx-auto">
        Connecting to PostgreSQL and loading enterprise configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
              <Settings className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              CRM & Company Configuration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enterprise legal branding, sequential document prefixes, and official contact parameters.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Building2 className="w-4 h-4 text-brand-700" />
            <span>Company Legal & Brand Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent Company Legal Name *
              </label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Formulation Brand *
              </label>
              <input
                type="text"
                required
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN Registration Number
              </label>
              <input
                type="text"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Support Phone *
              </label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Business Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Operating Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Sequential Numbering Prefixes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <FileSpreadsheet className="w-4 h-4 text-brand-700" />
            <span>Document Numbering & Sequences</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Prefix</label>
              <input
                type="text"
                value={form.orderPrefix}
                onChange={(e) => setForm({ ...form, orderPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sale Prefix</label>
              <input
                type="text"
                value={form.salePrefix}
                onChange={(e) => setForm({ ...form, salePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Prefix</label>
              <input
                type="text"
                value={form.quotationPrefix}
                onChange={(e) => setForm({ ...form, quotationPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Outward Prefix</label>
              <input
                type="text"
                value={form.outwardPrefix}
                onChange={(e) => setForm({ ...form, outwardPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Prefix</label>
              <input
                type="text"
                value={form.paymentPrefix}
                onChange={(e) => setForm({ ...form, paymentPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier Prefix</label>
              <input
                type="text"
                value={form.supplierPrefix}
                onChange={(e) => setForm({ ...form, supplierPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Order Prefix</label>
              <input
                type="text"
                value={form.poPrefix}
                onChange={(e) => setForm({ ...form, poPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 px-4 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Enterprise Parameters..." : "Save System Configuration"}</span>
        </button>
      </form>
    </div>
  );
}
