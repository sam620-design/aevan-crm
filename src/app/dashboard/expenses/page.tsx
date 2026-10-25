"use client";

import { useState, useEffect } from "react";
import {
  CircleDollarSign,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  Ban,
  Tag,
  Calendar,
  X,
  CreditCard,
  Building2,
  Eye,
  Edit2,
  Trash2,
  FolderPlus,
  User,
  MapPin,
  FileText,
} from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

interface Expense {
  id: string;
  expenseNumber: string;
  categoryId: string;
  title: string;
  description?: string | null;
  amount: number | string;
  tax: number | string;
  totalAmount: number | string;
  status: string;
  expenseDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  rejectionReason?: string | null;
  category: ExpenseCategory;
  supplier?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    role?: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  } | null;
  approvedAt?: string | null;
  createdAt?: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail Modal
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Record Expense Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");

  // Edit Expense Modal
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editTax, setEditTax] = useState("0");
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editReferenceNumber, setEditReferenceNumber] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editLocationId, setEditLocationId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // New Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  async function fetchExpenses() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses || data.items || []);
      } else {
        setError(data.error || "Failed to load expenses");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [catRes, suppRes, locRes] = await Promise.all([
        fetch("/api/expenses/categories"),
        fetch("/api/suppliers"),
        fetch("/api/locations"),
      ]);
      const [catData, suppData, locData] = await Promise.all([
        catRes.json(),
        suppRes.json(),
        locRes.json(),
      ]);

      if (catRes.ok) setCategories(catData.categories || []);
      if (suppRes.ok) setSuppliers(suppData.suppliers || []);
      if (locRes.ok) setLocations(locData.locations || locData || []);
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !title.trim() || Number(amount) <= 0) {
      alert("Please select category, enter title, and a valid amount");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          amount: Number(amount),
          tax: Number(tax) || 0,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
          supplierId: supplierId || undefined,
          locationId: locationId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setModalOpen(false);
        setTitle("");
        setDescription("");
        setAmount("");
        setTax("0");
        setReferenceNumber("");
        setSupplierId("");
        setLocationId("");
        setSuccess(`Expense "${data.expense?.expenseNumber || "New"}" recorded successfully!`);
        fetchExpenses();
      } else {
        alert(data.error || "Failed to record expense");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(exp: Expense) {
    setEditingExpense(exp);
    setEditCategoryId(exp.categoryId || exp.category?.id || "");
    setEditTitle(exp.title || "");
    setEditDescription(exp.description || "");
    setEditAmount(String(exp.amount || ""));
    setEditTax(String(exp.tax || "0"));
    setEditPaymentMethod(exp.paymentMethod || "CASH");
    setEditReferenceNumber(exp.referenceNumber || "");
    setEditSupplierId(exp.supplier?.id || "");
    setEditLocationId(exp.location?.id || "");
  }

  async function handleUpdateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!editingExpense) return;
    if (!editTitle.trim() || Number(editAmount) <= 0) {
      alert("Please enter title and a valid amount");
      return;
    }

    try {
      setSavingEdit(true);
      setError(null);
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editCategoryId || undefined,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          amount: Number(editAmount),
          tax: Number(editTax) || 0,
          paymentMethod: editPaymentMethod,
          referenceNumber: editReferenceNumber.trim() || null,
          supplierId: editSupplierId || null,
          locationId: editLocationId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingExpense(null);
        if (selectedExpense?.id === editingExpense.id) {
          setSelectedExpense(data.expense);
        }
        setSuccess(`Expense voucher ${editingExpense.expenseNumber} updated successfully!`);
        fetchExpenses();
      } else {
        alert(data.error || "Failed to update expense");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteExpense() {
    if (!deleteConfirmExpense) return;
    try {
      setDeleting(true);
      setError(null);
      const res = await fetch(`/api/expenses/${deleteConfirmExpense.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || `Expense ${deleteConfirmExpense.expenseNumber} deleted successfully.`);
        if (selectedExpense?.id === deleteConfirmExpense.id) {
          setSelectedExpense(null);
        }
        setDeleteConfirmExpense(null);
        fetchExpenses();
      } else {
        alert(data.error || "Failed to delete expense");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setSavingCategory(true);
      const res = await fetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          code: newCatCode.trim() || undefined,
          description: newCatDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategoryModalOpen(false);
        setNewCatName("");
        setNewCatCode("");
        setNewCatDesc("");
        setSuccess(`Category "${data.category.name}" created!`);
        await fetchMetadata();
        setCategoryId(data.category.id);
      } else {
        alert(data.error || "Failed to create category");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Expense approved successfully.");
        if (selectedExpense?.id === id) {
          setSelectedExpense((prev) => (prev ? { ...prev, status: "APPROVED" } : null));
        }
        fetchExpenses();
      } else {
        alert(data.error || "Failed to approve expense");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    }
  }

  async function handleConfirmReject() {
    if (!rejectingExpenseId || !rejectReason.trim()) {
      alert("Please enter a rejection reason");
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${rejectingExpenseId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRejectModalOpen(false);
        setRejectingExpenseId(null);
        setRejectReason("");
        setSuccess("Expense marked as rejected.");
        if (selectedExpense?.id === rejectingExpenseId) {
          setSelectedExpense((prev) => (prev ? { ...prev, status: "REJECTED", rejectionReason: rejectReason } : null));
        }
        fetchExpenses();
      } else {
        alert(data.error || "Failed to reject expense");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
      case "SUBMITTED":
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-300";
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-300";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  // KPI Calculations
  const totalCount = expenses.length;
  const totalSpend = expenses.reduce((sum, exp) => sum + Number(exp.totalAmount || 0), 0);
  const pendingExpenses = expenses.filter(
    (e) => e.status === "POSTED" || e.status === "SUBMITTED" || e.status === "PENDING"
  );
  const pendingSpend = pendingExpenses.reduce((sum, exp) => sum + Number(exp.totalAmount || 0), 0);
  const approvedExpenses = expenses.filter((e) => e.status === "APPROVED");
  const approvedSpend = approvedExpenses.reduce((sum, exp) => sum + Number(exp.totalAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Operational Expenses</h1>
            <p className="text-xs text-slate-500">
              Track company expenditures, utility overheads, raw materials & management approvals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => {
              setCategoryId(categories[0]?.id || "");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-xl text-xs font-semibold hover:bg-brand-900 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded</p>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">
              ₹{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{totalCount} vouchers recorded</p>
          </div>
          <div className="p-3 bg-brand-50 rounded-xl text-brand-700">
            <CircleDollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
            <h3 className="text-lg font-black text-amber-700 mt-0.5">
              ₹{pendingSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{pendingExpenses.length} awaiting approval</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved Expenses</p>
            <h3 className="text-lg font-black text-emerald-700 mt-0.5">
              ₹{approvedSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{approvedExpenses.length} finalized & approved</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by expense voucher (EXP-...), title, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-700"
        >
          <option value="">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-700"
        >
          <option value="">All Statuses</option>
          <option value="POSTED">Under Review (Posted)</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Expenses Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          Loading expenses from database...
        </div>
      ) : expenses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <CircleDollarSign className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800 text-sm">No expenses found</h3>
          <p className="text-xs text-slate-500">Record operational overheads or adjust your filters.</p>
          <button
            onClick={() => {
              setCategoryId(categories[0]?.id || "");
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-800 text-white rounded-xl text-xs font-semibold hover:bg-brand-900"
          >
            <Plus className="w-4 h-4" />
            <span>Record First Expense</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.map((exp) => {
            const isPending =
              exp.status === "POSTED" || exp.status === "SUBMITTED" || exp.status === "PENDING";
            return (
              <div
                key={exp.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        {exp.expenseNumber}
                      </span>
                      <h3
                        onClick={() => setSelectedExpense(exp)}
                        className="text-sm font-bold text-slate-900 mt-1 cursor-pointer hover:text-brand-700 transition-colors"
                      >
                        {exp.title}
                      </h3>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {exp.category?.name || "Uncategorized"}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        exp.status
                      )}`}
                    >
                      {exp.status}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 my-2.5 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span>{new Date(exp.expenseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Method:</span>
                      <span className="font-medium text-slate-800">{exp.paymentMethod.replace("_", " ")}</span>
                    </div>
                    {exp.referenceNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reference:</span>
                        <span className="font-mono text-slate-800">{exp.referenceNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-100">
                      <span>Total:</span>
                      <span className="text-brand-900">
                        ₹{Number(exp.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {exp.status === "REJECTED" && exp.rejectionReason && (
                      <p className="text-[11px] text-rose-600 italic mt-1">
                        Reason: {exp.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">By {exp.createdBy?.name || "Staff"}</span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedExpense(exp)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="View Voucher Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Expense"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmExpense(exp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(exp.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
                          title="Approve expense"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setRejectingExpenseId(exp.id);
                            setRejectModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Reject expense"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 space-y-4 p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {selectedExpense.expenseNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      selectedExpense.status
                    )}`}
                  >
                    {selectedExpense.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedExpense.title}</h2>
              </div>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Category</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedExpense.category?.name}</p>
                  {selectedExpense.category?.description && (
                    <p className="text-[10px] text-slate-500">{selectedExpense.category.description}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Date & Payment</p>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {new Date(selectedExpense.expenseDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-slate-500">{selectedExpense.paymentMethod.replace("_", " ")}</p>
                </div>
              </div>

              {selectedExpense.description && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Description / Purpose</p>
                  <p className="text-slate-700 mt-0.5">{selectedExpense.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedExpense.supplier && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Supplier / Vendor</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedExpense.supplier.name}</p>
                    {selectedExpense.supplier.phone && (
                      <p className="text-[10px] text-slate-500">{selectedExpense.supplier.phone}</p>
                    )}
                  </div>
                )}
                {selectedExpense.location && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Facility / Warehouse</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedExpense.location.name}</p>
                  </div>
                )}
              </div>

              {/* Financial Calculation */}
              <div className="border border-slate-100 rounded-xl p-3 bg-white space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Amount:</span>
                  <span>₹{Number(selectedExpense.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax / GST:</span>
                  <span>₹{Number(selectedExpense.tax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-brand-900 pt-1.5 border-t">
                  <span>Total Amount:</span>
                  <span>₹{Number(selectedExpense.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Audit trail */}
              <div className="text-[11px] text-slate-500 border-t pt-2 space-y-1">
                <p>Created by: <strong className="text-slate-700">{selectedExpense.createdBy?.name || "System"}</strong></p>
                {selectedExpense.approvedBy && (
                  <p className="text-emerald-700">
                    Approved by: <strong>{selectedExpense.approvedBy.name}</strong>
                    {selectedExpense.approvedAt && ` on ${new Date(selectedExpense.approvedAt).toLocaleDateString("en-IN")}`}
                  </p>
                )}
                {selectedExpense.rejectionReason && (
                  <p className="text-rose-600">Rejection reason: <em>{selectedExpense.rejectionReason}</em></p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={() => {
                  const exp = selectedExpense;
                  setSelectedExpense(null);
                  setDeleteConfirmExpense(exp);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const exp = selectedExpense;
                    setSelectedExpense(null);
                    openEditModal(exp);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="text-xs bg-brand-800 hover:bg-brand-900 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="w-5 h-5 text-indigo-700" />
                <h2 className="text-base font-bold text-slate-900">Record Operational Expense</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Expense Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    className="text-[11px] text-brand-700 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Category</span>
                  </button>
                </div>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory generator diesel refuel, Printing stationeries, Machine parts"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtotal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax / GST (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              {Number(amount) > 0 && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-semibold text-brand-900">Computed Total Amount:</span>
                  <span className="text-sm font-black text-brand-950">
                    ₹{(Number(amount) + (Number(tax) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Bill #</label>
                  <input
                    type="text"
                    placeholder="e.g. Bill #8392 or UPI Ref"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier / Payee</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="">-- Optional Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse / Location</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="">-- Optional Location --</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-800 text-white rounded-xl text-xs font-semibold hover:bg-brand-900 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : "Record & Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 my-8">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-700" />
                <h2 className="text-base font-bold text-slate-900">
                  Edit Expense {editingExpense.expenseNumber}
                </h2>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Category *
                </label>
                <select
                  required
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtotal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax / GST (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editTax}
                    onChange={(e) => setEditTax(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Bill #</label>
                  <input
                    type="text"
                    value={editReferenceNumber}
                    onChange={(e) => setEditReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-700 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {savingEdit ? "Updating..." : "Update Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Expense</h3>
                <p className="text-xs text-slate-500">{deleteConfirmExpense.expenseNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete expense voucher{" "}
              <strong className="text-slate-900">{deleteConfirmExpense.expenseNumber}</strong> (
              {deleteConfirmExpense.title}) for{" "}
              <strong>
                ₹{Number(deleteConfirmExpense.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteExpense}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CATEGORY MODAL */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-slate-900 text-sm">New Expense Category</h3>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel & Conveyance, Fuel"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EXP-TRV"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-4 py-2 bg-brand-800 text-white rounded-xl font-semibold hover:bg-brand-900 disabled:opacity-50"
                >
                  {savingCategory ? "Saving..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT EXPENSE MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Reject Operational Expense</h3>
            <p className="text-xs text-slate-500">
              Provide an audit explanation for rejecting this expenditure voucher.
            </p>

            <textarea
              required
              rows={3}
              placeholder="e.g. Missing original tax invoice, unauthorized purchase..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectingExpenseId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
