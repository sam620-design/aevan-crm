import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  ShieldAlert,
  ShoppingCart,
  Receipt,
  PackageMinus,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isSuper = user?.role === "SUPERADMIN";

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Welcome & Status Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-slate-900 to-brand-950 rounded-2xl p-6 text-white border border-brand-800/40 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-800/80 border border-brand-500/30 text-brand-300 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Phase 1 Initialized & Active</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.name}
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              AEVAN Cleaning Operating System • Role:{" "}
              <span className="font-semibold text-brand-300">{user?.role}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSuper ? (
              <Link
                href="/dashboard/permissions"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl text-xs transition-colors shadow-md"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Manage Global Permissions</span>
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/80 text-slate-400 rounded-xl text-xs border border-slate-700">
                <Lock className="w-4 h-4" />
                <span>Superadmin-Enforced Policy Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical System Guarantees & Constraints Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Orders vs Sales
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShoppingCart className="w-4 h-4" />
            </span>
          </div>
          <p className="text-base font-bold text-slate-900">
            Strict Separation Enforced
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Orders never generate invoices. Invoices are strictly generated upon Sale finalization. Status transitions are pending confirmation.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Physical Stock Outward
            </span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <PackageMinus className="w-4 h-4" />
            </span>
          </div>
          <p className="text-base font-bold text-slate-900">
            Zero Double-Deduction Engine
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Inventory Outward records physical movements independently. Linking outward to a Sale never double-deducts stock.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Payments & Ledger
            </span>
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <p className="text-base font-bold text-slate-900">
            Two-Phase Verification
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Unverified payments stay in Pending Verification. Customer ledger entries are non-destructive and fully auditable.
          </p>
        </div>
      </div>

      {/* Pending Confirmation Policy Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <p className="font-semibold text-amber-950">
            Mandatory Business Policy Locks (Pending Formal Confirmation):
          </p>
          <p>
            • <strong>Negative-Stock Overrides:</strong> Strictly disabled. Stock availability is guarded at the database level.
          </p>
          <p>
            • <strong>Profit, Margin & Cost Data:</strong> Strictly locked. Only visible if Superadmin explicitly assigns <code>VIEW_PROFIT_MARGINS</code> permission.
          </p>
          <p>
            • <strong>Order & Sales Status Automations:</strong> Automatic or speculative status transitions are disabled until final workflow confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
