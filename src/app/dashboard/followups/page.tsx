"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Search,
  Plus,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function FollowUpsPage() {
  const [search, setSearch] = useState("");

  const tasks = [
    {
      id: "TSK-01",
      customer: "Rajesh Hardware & Sanitation",
      type: "CALL",
      scheduled: "Today, 03:00 PM",
      purpose: "Follow-up on balance payment of ₹25,000 for INV-1002",
      assignedTo: "Rahul Kumar (Staff)",
      status: "PENDING",
    },
    {
      id: "TSK-02",
      customer: "Hotel Nalanda Residency",
      type: "WHATSAPP",
      scheduled: "Tomorrow, 11:00 AM",
      purpose: "Send quotation QTN-1001 revision and check service schedule",
      assignedTo: "Rahul Kumar (Staff)",
      status: "PENDING",
    },
    {
      id: "TSK-03",
      customer: "Patna Central Cleaning Supplies",
      type: "MEETING",
      scheduled: "08 Oct 2026",
      purpose: "Super Stockist quarterly review and dispatch planning",
      assignedTo: "Priya Sharma (Admin)",
      status: "COMPLETED",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-brand-700" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Follow-ups & CRM Tasks
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Customer call schedules, WhatsApp check-ins, and task assignments.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 active:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Task / Follow-up</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or task purpose..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-600 shadow-sm"
        />
      </div>

      <div className="space-y-3">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    t.type === "CALL"
                      ? "bg-blue-50 text-blue-700"
                      : t.type === "WHATSAPP"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-purple-50 text-purple-700"
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
                  <h3 className="font-bold text-slate-900 text-sm">{t.customer}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t.scheduled}</span>
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {t.status}
              </span>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              {t.purpose}
            </p>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Assigned: {t.assignedTo}</span>

              {t.status === "PENDING" && (
                <button
                  onClick={() => alert(`Marking task ${t.id} completed!`)}
                  className="px-3 py-1.5 bg-brand-700 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Mark Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
