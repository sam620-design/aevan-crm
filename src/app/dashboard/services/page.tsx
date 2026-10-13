"use client";

import { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  XCircle,
  Eye,
  Building,
  DollarSign,
  Tag,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface CleaningServiceItem {
  id: string;
  serviceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  serviceAddress: string;
  propertyType?: string | null;
  propertySize?: string | null;
  category: string;
  customCategory?: string | null;
  requirements?: string | null;
  scheduledDate: string;
  timeSlot?: string | null;
  assignedStaffId?: string | null;
  assignedStaff?: { id: string; name: string; email: string; phone?: string | null } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  status: "SCHEDULED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "RESCHEDULED" | "CANCELLED";
  estimatedPrice: number;
  finalPrice?: number | null;
  billingStatus: string;
  completionNotes?: string | null;
  completedAt?: string | null;
  followUpDate?: string | null;
}

export default function ServicesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [services, setServices] = useState<CleaningServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Booking modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Create Form State
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    serviceAddress: "",
    propertyType: "Residential",
    propertySize: "",
    category: "DEEP_CLEANING",
    requirements: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    timeSlot: "10:00 AM - 01:00 PM",
    assignedStaffId: "",
    estimatedPrice: 2500,
  });

  // Action / Detail modal
  const [selectedService, setSelectedService] = useState<CleaningServiceItem | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "RESCHEDULED" | "CANCELLED" | "VIEW";
    service: CleaningServiceItem;
  } | null>(null);

  const [transitioning, setTransitioning] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [finalPrice, setFinalPrice] = useState<number | "">("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  useEffect(() => {
    fetchSession();
  }, []);

  async function fetchSession() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        fetchServices();
        fetchAuxiliaryData();
      }
    } catch (err) {
      console.error("Session check failed:", err);
    }
  }

  async function fetchServices() {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedStatus !== "ALL") queryParams.append("status", selectedStatus);
      if (selectedCategory !== "ALL") queryParams.append("category", selectedCategory);
      if (search) queryParams.append("search", search);

      const res = await fetch(`/api/services?${queryParams.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load services");
      }
      const data = await res.json();
      setServices(data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAuxiliaryData() {
    try {
      const [custRes, staffRes] = await Promise.all([
        fetch("/api/customers?limit=100"),
        fetch("/api/users"),
      ]);
      if (custRes.ok) {
        const cData = await custRes.json();
        setCustomers(cData.data || cData.customers || []);
      }
      if (staffRes.ok) {
        const sData = await staffRes.json();
        // Filter to STAFF users only
        const allStaff = (sData.users || []).filter((u: any) => u.role === "STAFF");
        setStaffList(allStaff);
      }
    } catch (err) {
      console.error("Failed to load auxiliary data:", err);
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchServices();
    }
  }, [selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchServices();
  };

  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setFormData((prev) => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone.replace("+91", ""),
        customerEmail: cust.email || "",
        serviceAddress: cust.billingAddress || cust.shippingAddress || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, customerId: "" }));
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        customerPhone: formData.customerPhone.startsWith("+91")
          ? formData.customerPhone
          : `+91${formData.customerPhone.replace(/\D/g, "")}`,
        estimatedPrice: Number(formData.estimatedPrice) || 0,
      };

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book service");
      }

      setShowCreateModal(false);
      // Reset form
      setFormData({
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        serviceAddress: "",
        propertyType: "Residential",
        propertySize: "",
        category: "DEEP_CLEANING",
        requirements: "",
        scheduledDate: new Date().toISOString().split("T")[0],
        timeSlot: "10:00 AM - 01:00 PM",
        assignedStaffId: "",
        estimatedPrice: 2500,
      });
      fetchServices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    setTransitioning(true);
    setError(null);
    try {
      const payload: any = {
        status: actionModal.type,
        reason: statusReason || undefined,
        completionNotes: completionNotes || undefined,
        finalPrice: finalPrice !== "" ? Number(finalPrice) : undefined,
        followUpDate: followUpDate || undefined,
      };

      const res = await fetch(`/api/services/${actionModal.service.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Status update failed");
      }

      setActionModal(null);
      setStatusReason("");
      setFinalPrice("");
      setCompletionNotes("");
      setFollowUpDate("");
      fetchServices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Scheduled</span>;
      case "ARRIVED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Team Arrived</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200 animate-pulse">In Progress</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>;
      case "RESCHEDULED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 border border-sky-200">Rescheduled</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-800"></div>
      </div>
    );
  }

  return (
    <DashboardShell user={currentUser}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-brand-50 text-brand-800 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Cleaning Services</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Track professional cleaning jobs from scheduling and arrival through execution and completion.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-medium rounded-xl shadow-sm transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Book Cleaning Job
            </button>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Status Filter Tabs & Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
            {["ALL", "SCHEDULED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedStatus === st
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {st === "ALL" ? "All Jobs" : getCategoryLabel(st)}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by job #, customer name, phone, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </form>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full md:w-auto"
            >
              <option value="ALL">All Categories</option>
              <option value="DEEP_CLEANING">Deep Cleaning</option>
              <option value="OFFICE_CLEANING">Office Cleaning</option>
              <option value="SOFA_CLEANING">Sofa Cleaning</option>
              <option value="CARPET_CLEANING">Carpet Cleaning</option>
              <option value="TANK_CLEANING">Tank Cleaning</option>
              <option value="SANITIZATION">Sanitization</option>
              <option value="FACILITY_MANAGEMENT">Facility Management</option>
            </select>
          </div>
        </div>

        {/* Services List / Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-800"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Cleaning Services Found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              No service records match your current filters. Book a new service to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-brand-800 text-white text-xs font-semibold rounded-xl hover:bg-brand-900 transition-colors"
            >
              Book Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {services.map((job) => (
              <div
                key={job.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {job.serviceNumber}
                      </span>
                      <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        {getCategoryLabel(job.category)}
                      </span>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {job.customerName}
                      </h4>
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {job.customerPhone}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{job.serviceAddress}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(job.scheduledDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {job.timeSlot && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {job.timeSlot}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        ₹{Number(job.finalPrice || job.estimatedPrice).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {job.assignedStaff && (
                      <div className="mt-2 text-xs bg-slate-50 p-2 rounded-lg flex items-center justify-between border border-slate-100">
                        <span className="text-slate-500">Assigned Team/Staff:</span>
                        <span className="font-semibold text-slate-800">{job.assignedStaff.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedService(job);
                      setActionModal({ type: "VIEW", service: job });
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>

                  <div className="flex items-center gap-1.5">
                    {job.status === "SCHEDULED" && (
                      <button
                        onClick={() => setActionModal({ type: "ARRIVED", service: job })}
                        className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Mark Arrived
                      </button>
                    )}

                    {job.status === "ARRIVED" && (
                      <button
                        onClick={() => setActionModal({ type: "IN_PROGRESS", service: job })}
                        className="px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Start Job
                      </button>
                    )}

                    {job.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => {
                          setFinalPrice(job.estimatedPrice);
                          setActionModal({ type: "COMPLETED", service: job });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Complete Job
                      </button>
                    )}

                    {(job.status === "SCHEDULED" || job.status === "ARRIVED") && (
                      <button
                        onClick={() => setActionModal({ type: "CANCELLED", service: job })}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CREATE / BOOK SERVICE MODAL */}
        {/* ------------------------------------------------------------- */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col my-8">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-brand-50 text-brand-800 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Book Cleaning Job</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateService} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Select Existing Customer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Customer (Optional - or type below)
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50"
                  >
                    <option value="">-- New or Unregistered Client --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={formData.customerPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, customerPhone: e.target.value.replace(/\D/g, "") })
                        }
                        placeholder="10-digit number"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-r-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.serviceAddress}
                    onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                    placeholder="Street address, flat no, landmark, locality..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="DEEP_CLEANING">Deep Cleaning</option>
                      <option value="OFFICE_CLEANING">Office Cleaning</option>
                      <option value="SOFA_CLEANING">Sofa Cleaning</option>
                      <option value="CARPET_CLEANING">Carpet Cleaning</option>
                      <option value="TANK_CLEANING">Tank Cleaning</option>
                      <option value="SANITIZATION">Sanitization</option>
                      <option value="FACILITY_MANAGEMENT">Facility Management</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Property Type
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Apartment / Flat">Apartment / Flat</option>
                      <option value="Villa / House">Villa / House</option>
                      <option value="Office">Office</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Size / BHK</label>
                    <input
                      type="text"
                      value={formData.propertySize}
                      onChange={(e) => setFormData({ ...formData, propertySize: e.target.value })}
                      placeholder="e.g. 3 BHK / 1500 sq ft"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scheduled Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                    <select
                      value={formData.timeSlot}
                      onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="08:00 AM - 11:00 AM">08:00 AM - 11:00 AM</option>
                      <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                      <option value="04:00 PM - 07:00 PM">04:00 PM - 07:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assign Staff Member
                    </label>
                    <select
                      value={formData.assignedStaffId}
                      onChange={(e) => setFormData({ ...formData, assignedStaffId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">-- Unassigned --</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estimated Price (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.estimatedPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, estimatedPrice: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Requirements / Special Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.requirements}
                    onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                    placeholder="Specific stain cleaning, balconies, kitchen chimney, etc."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 text-xs font-semibold bg-brand-800 hover:bg-brand-900 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {creating ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STATUS TRANSITION OR DETAIL MODAL */}
        {/* ------------------------------------------------------------- */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg my-8">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {actionModal.type === "VIEW" ? (
                    <>
                      <Eye className="w-5 h-5 text-brand-800" />
                      Job Details: {actionModal.service.serviceNumber}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5 text-brand-800" />
                      Update Status: {actionModal.type}
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setActionModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {actionModal.type === "VIEW" ? (
                <div className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 block">Customer</span>
                      <span className="font-bold text-slate-800">{actionModal.service.customerName}</span>
                      <span className="text-slate-500 block">{actionModal.service.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status</span>
                      <div className="mt-1">{getStatusBadge(actionModal.service.status)}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block">Address</span>
                    <p className="font-medium text-slate-800 mt-0.5">{actionModal.service.serviceAddress}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 border border-slate-100 rounded-lg">
                      <span className="text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-800">
                        {getCategoryLabel(actionModal.service.category)}
                      </span>
                    </div>
                    <div className="p-2 border border-slate-100 rounded-lg">
                      <span className="text-slate-400 block">Estimated</span>
                      <span className="font-semibold text-emerald-700">
                        ₹{Number(actionModal.service.estimatedPrice).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="p-2 border border-slate-100 rounded-lg">
                      <span className="text-slate-400 block">Final Price</span>
                      <span className="font-semibold text-slate-800">
                        {actionModal.service.finalPrice
                          ? `₹${Number(actionModal.service.finalPrice).toLocaleString("en-IN")}`
                          : "Pending"}
                      </span>
                    </div>
                  </div>

                  {actionModal.service.requirements && (
                    <div>
                      <span className="text-slate-400 block">Requirements / Notes</span>
                      <p className="text-slate-700 mt-1 bg-slate-50 p-2.5 rounded-lg">
                        {actionModal.service.requirements}
                      </p>
                    </div>
                  )}

                  {actionModal.service.completionNotes && (
                    <div>
                      <span className="text-slate-400 block">Completion Notes</span>
                      <p className="text-slate-700 mt-1 bg-emerald-50 text-emerald-900 p-2.5 rounded-lg border border-emerald-100">
                        {actionModal.service.completionNotes}
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStatusTransition} className="p-5 space-y-4">
                  <p className="text-xs text-slate-600">
                    Confirm transition of job <strong>{actionModal.service.serviceNumber}</strong> from{" "}
                    <strong>{actionModal.service.status}</strong> to{" "}
                    <strong className="text-brand-800">{actionModal.type}</strong>.
                  </p>

                  {actionModal.type === "COMPLETED" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Final Billed Price (₹)
                        </label>
                        <input
                          type="number"
                          required
                          value={finalPrice}
                          onChange={(e) =>
                            setFinalPrice(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Completion Notes
                        </label>
                        <textarea
                          rows={2}
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          placeholder="Client inspection result, areas cleaned, key observations..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Next Follow-up / Maintenance Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {actionModal.type === "CANCELLED" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cancellation Reason *
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="Client rescheduled, unreachable, duplicate booking..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActionModal(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={transitioning}
                      className="px-5 py-2 text-xs font-semibold bg-brand-800 hover:bg-brand-900 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50"
                    >
                      {transitioning ? "Updating..." : "Confirm Status Update"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
