import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  CalendarCheck,
  PackageMinus,
  Users,
  Clock,
} from "lucide-react";

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <h2 className="text-xl font-bold tracking-tight">
          Field Staff Workspace
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Logged in as: <strong className="text-white">{user?.name}</strong> • Scoped to assigned customers & daily dispatches.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/followups"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl group-hover:bg-blue-700 group-hover:text-white transition-colors">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Assigned Tasks & Calls</h3>
              <p className="text-[11px] text-slate-500">Daily follow-ups</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            View scheduled customer calls, client visits, and task status.
          </p>
        </Link>

        <Link
          href="/dashboard/outward"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl group-hover:bg-amber-700 group-hover:text-white transition-colors">
              <PackageMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Stock Outward Requests</h3>
              <p className="text-[11px] text-slate-500">Dispatch log</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Record physical stock taken out with manual purpose and disposition reconciliation.
          </p>
        </Link>

        <Link
          href="/dashboard/customers"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-100 text-brand-800 rounded-xl group-hover:bg-brand-700 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Assigned Clients</h3>
              <p className="text-[11px] text-slate-500">Contact & Ledger</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Quick phone call and WhatsApp access for your assigned customer territory.
          </p>
        </Link>
      </div>
    </div>
  );
}
