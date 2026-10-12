import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import {
  ShieldAlert,
  Building2,
  Tag,
  Users,
  Package,
  ArrowLeftRight,
  History,
  CheckCircle2,
} from "lucide-react";

export default async function SuperadminDashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <h2 className="text-xl font-bold tracking-tight">
          Superadmin Command Center
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Root system authority: Global permissions, multi-location facility control, and price tier policies.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/permissions"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-brand-100 text-brand-800 rounded-xl group-hover:bg-brand-700 group-hover:text-white transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Global Permissions</h3>
              <p className="text-[11px] text-slate-500">Root-only authorization</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Grant, modify, and revoke fine-grained permissions for Admins and Staff with audit reason.
          </p>
        </Link>

        <Link
          href="/dashboard/inventory"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl group-hover:bg-blue-700 group-hover:text-white transition-colors">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Facility Locations</h3>
              <p className="text-[11px] text-slate-500">Warehouses & Depots</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Create and manage storage locations. Deactivation strictly requires 0 unresolved stock.
          </p>
        </Link>

        <Link
          href="/dashboard/customers"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl group-hover:bg-purple-700 group-hover:text-white transition-colors">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Customer Price Lists</h3>
              <p className="text-[11px] text-slate-500">Multi-tier pricing</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Retail, Wholesale, Super Stockist (₹5L), State Level (₹7L), and District (₹3L) price tiers.
          </p>
        </Link>
      </div>
    </div>
  );
}
