"use client";

import { useState, useEffect } from "react";
import {
  CalendarCheck,
  Search,
  Plus,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Eye,
  Edit2,
  Trash2,
  User,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  customerCode?: string;
}

interface FollowUpItem {
  id: string;
  type: "CALL" | "WHATSAPP" | "MEETING" | "NOTE";
  scheduledDate: string;
  status: "PENDING" | "COMPLETED" | "SNOOZED" | "CANCELLED";
  outcome?: string | null;
  customer: Customer;
  assignedTo?: { id: string; name: string; email: string; phone?: string | null } | null;
  createdBy?: { id: string; name: string; email: string } | null;
}

export default function FollowUpsPage() {
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    type: "CALL",
    scheduledDate: new Date(Date.now() + 3600 * 1000 * 2).toISOString().slice(0, 16),
    outcome: "",
    assignedToId: "",
  });

  // Detail Modal
  const [detailFollowup, setDetailFollowup] = useState<FollowUpItem | null>(null);

  // Edit Modal
  const [editFollowup, setEditFollowup] = useState<FollowUpItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    type: "CALL",
    scheduledDate: "",
    status: "PENDING",
    outcome: "",
    assignedToId: "",
  });

  // Delete Confirm
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<FollowUpItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFollowups();
    fetchAuxiliaryData();
  }, [statusFilter, typeFilter]);

  async function fetchFollowups() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/followups?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setFollowups(data.followups || []);
      } else {
        setErrorMsg(data.error || "Failed to load follow-ups");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error loading follow-ups");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuxiliaryData() {
    try {
      const [custRes, userRes] = await Promise.all([
        fetch("/api/customers?limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
        fetch("/api/users").then((r) => (r.ok ? r.json() : { users: [] })),
      ]);
      const custData = custRes.data || custRes.customers || [];
      setCustomers(custData);
      if (custData.length > 0 && !formData.customerId) {
        setFormData((prev) => ({ ...prev, customerId: custData[0].id }));
      }
      setStaffList(userRes.users || []);
    } catch (err) {
      console.error("Failed to load auxiliary data:", err);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      setSuccessMsg("Follow-up task created successfully!");
      setShowCreateModal(false);
      setFormData({
        customerId: customers[0]?.id || "",
        type: "CALL",
        scheduledDate: new Date(Date.now() + 3600 * 1000 * 2).toISOString().slice(0, 16),
        outcome: "",
        assignedToId: "",
      });
      fetchFollowups();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleOpenEdit(f: FollowUpItem) {
    setEditFollowup(f);
    setEditFormData({
      type: f.type,
      scheduledDate: f.scheduledDate ? new Date(f.scheduledDate).toISOString().slice(0, 16) : "",
      status: f.status,
      outcome: f.outcome || "",
      assignedToId: f.assignedTo?.id || "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editFollowup) return;
    setEditing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/followups/${editFollowup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");

      setSuccessMsg("Follow-up task updated successfully!");
      setEditFollowup(null);
      fetchFollowups();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEditing(false);
    }
  }

  async function handleToggleStatus(f: FollowUpItem, newStatus: "COMPLETED" | "PENDING") {
    try {
      const res = await fetch(`/api/followups/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setSuccessMsg(`Task marked as ${newStatus.toLowerCase()}!`);
      fetchFollowups();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleDelete() {
    if (!deleteConfirmItem) return;
    setDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/followups/${deleteConfirmItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete task");

      setSuccessMsg("Task deleted successfully!");
      setDeleteConfirmItem(null);
      if (detailFollowup?.id === deleteConfirmItem.id) {
        setDetailFollowup(null);
      }
      fetchFollowups();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = followups.filter((f) => {
    const term = search.toLowerCase();
    const matchSearch =
      f.customer?.name?.toLowerCase().includes(term) ||
      f.customer?.phone?.includes(term) ||
      (f.outcome && f.outcome.toLowerCase().includes(term));
    return matchSearch;
  });

  // KPI counters
  const totalTasks = followups.length;
  const pendingTasks = followups.filter((f) => f.status === "PENDING").length;
  const completedTasks = followups.filter((f) => f.status === "COMPLETED").length;
  const callsDue = followups.filter((f) => f.type === "CALL" && f.status === "PENDING").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Follow-ups & CRM Tasks</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Customer call schedules, WhatsApp check-ins, payment reminders, and visit assignments.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Follow-up Task</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">Total Scheduled</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalTasks}</p>
          <span className="text-[10px] text-slate-500">Live CRM task records</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-700 uppercase">Pending Action</span>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{pendingTasks}</p>
          <span className="text-[10px] text-amber-600">Awaiting execution</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-blue-700 uppercase">Phone Calls Due</span>
          <p className="text-xl sm:text-2xl font-black text-blue-700 mt-1">{callsDue}</p>
          <span className="text-[10px] text-blue-600">Client call reminders</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 uppercase">Completed</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{completedTasks}</p>
          <span className="text-[10px] text-emerald-600">Successfully closed</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, phone, notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-600 shadow-sm"
          >
            <option value="ALL">All Statuses (Pending & Completed)</option>
            <option value="PENDING">Pending Only</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="SNOOZED">Snoozed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-600 shadow-sm"
          >
            <option value="ALL">All Channels (Calls, WhatsApp, Meetings)</option>
            <option value="CALL">Phone Calls</option>
            <option value="WHATSAPP">WhatsApp Messages</option>
            <option value="MEETING">On-site Meetings</option>
            <option value="NOTE">Internal Notes</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
            Loading scheduled follow-up tasks from PostgreSQL...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl space-y-2">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No follow-up tasks match this filter.</p>
            <p className="text-slate-400">Click &quot;New Follow-up Task&quot; above to schedule a reminder.</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      t.type === "CALL"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : t.type === "WHATSAPP"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : t.type === "MEETING"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {t.type === "CALL" ? (
                      <Phone className="w-4 h-4" />
                    ) : t.type === "WHATSAPP" ? (
                      <MessageSquare className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{t.customer?.name}</span>
                      <span className="text-xs text-slate-500 font-mono">({t.customer?.phone})</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(t.scheduledDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      t.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : t.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>

              {/* Purpose / Outcome */}
              {t.outcome && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <span className="font-bold text-slate-800 block mb-0.5">Task Objective / Notes:</span>
                  <p>{t.outcome}</p>
                </div>
              )}

              {/* Assigned Staff */}
              {t.assignedTo && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned Staff: </span>
                  <strong className="text-slate-700">{t.assignedTo.name}</strong>
                </div>
              )}

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDetailFollowup(t)}
                    className="px-2.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="px-2.5 py-1.5 text-xs text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmItem(t)}
                    className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {t.customer?.phone && (
                    <>
                      <a
                        href={`tel:${t.customer.phone}`}
                        className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${t.customer.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </>
                  )}

                  {t.status === "PENDING" ? (
                    <button
                      onClick={() => handleToggleStatus(t, "COMPLETED")}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Done
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(t, "PENDING")}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reopen
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Schedule New Follow-up</h3>
                  <p className="text-xs text-slate-500">Record a phone call, message, or visit task</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Client *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Task Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="MEETING">On-Site Meeting</option>
                    <option value="NOTE">General Note</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Staff Member</label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                >
                  <option value="">-- Assign to Me / Default --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose / Notes</label>
                <textarea
                  rows={3}
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  placeholder="e.g. Follow-up on quotation feedback, payment balance, or product demonstration..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600"
                />
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
                  disabled={creating}
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {creating ? "Scheduling..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailFollowup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Task Details</h3>
                  <p className="text-xs text-slate-500">Channel: {detailFollowup.type}</p>
                </div>
              </div>
              <button onClick={() => setDetailFollowup(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold">Client Name</span>
                  <span className="font-bold text-slate-900">{detailFollowup.customer?.name}</span>
                  <span className="text-slate-500 block">{detailFollowup.customer?.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Status</span>
                  <span className="font-bold text-brand-800">{detailFollowup.status}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Scheduled Date & Time</span>
                <span className="font-semibold text-slate-800">
                  {new Date(detailFollowup.scheduledDate).toLocaleString("en-IN", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              {detailFollowup.outcome && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-semibold block mb-0.5">Objective / Notes:</span>
                  <p className="text-slate-800">{detailFollowup.outcome}</p>
                </div>
              )}

              {detailFollowup.assignedTo && (
                <div>
                  <span className="text-slate-400 block font-semibold">Assigned Staff</span>
                  <span className="font-semibold text-slate-800">
                    {detailFollowup.assignedTo.name} ({detailFollowup.assignedTo.email})
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const f = detailFollowup;
                    setDetailFollowup(null);
                    handleOpenEdit(f);
                  }}
                  className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl font-bold flex items-center gap-1.5 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Task
                </button>
                <button
                  onClick={() => {
                    const f = detailFollowup;
                    setDetailFollowup(null);
                    setDeleteConfirmItem(f);
                  }}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
              <button
                onClick={() => setDetailFollowup(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editFollowup && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Task</h3>
                  <p className="text-xs text-slate-500">Client: {editFollowup.customer?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditFollowup(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Task Channel</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="MEETING">On-Site Meeting</option>
                    <option value="NOTE">General Note</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="SNOOZED">Snoozed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={editFormData.scheduledDate}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reassign Staff Member</label>
                <select
                  value={editFormData.assignedToId}
                  onChange={(e) => setEditFormData({ ...editFormData, assignedToId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600 font-semibold"
                >
                  <option value="">-- Keep Current Assignee --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Objective / Notes</label>
                <textarea
                  rows={3}
                  value={editFormData.outcome}
                  onChange={(e) => setEditFormData({ ...editFormData, outcome: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditFollowup(null)}
                  className="px-4 py-2 border rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {editing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Task?</h3>
                <p className="text-xs text-slate-500">Client: {deleteConfirmItem.customer?.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
              Are you sure you want to delete this scheduled follow-up task? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
