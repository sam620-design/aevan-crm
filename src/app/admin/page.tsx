import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  Users,
  ShoppingCart,
  Receipt,
  Package,
  PackageMinus,
  CreditCard,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <h2 className="text-xl font-bold tracking-tight">
          Operations Admin Dashboard
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Logged in as: <strong className="text-white">{user?.name}</strong> • Only explicitly authorized actions are enabled.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/customers"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-100 text-brand-800 rounded-xl group-hover:bg-brand-700 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Directory</h3>
              <p className="text-[11px] text-slate-500">Clients & Stockists</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Manage customer profiles, price list assignments, and credit tracking.
          </p>
        </Link>

        <Link
          href="/dashboard/sales"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sales & Invoicing</h3>
              <p className="text-[11px] text-slate-500">GST billing</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Generate invoices, convert completed orders, and track balances.
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
              <h3 className="font-bold text-slate-900 text-sm">Inventory Outward</h3>
              <p className="text-[11px] text-slate-500">Reconciliation</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Physical stock dispatches with full quantity reconciliation.
          </p>
        </Link>
      </div>
    </div>
  );
}
