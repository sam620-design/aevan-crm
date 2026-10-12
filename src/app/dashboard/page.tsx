import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ShieldAlert,
  ShoppingCart,
  Receipt,
  PackageMinus,
  CreditCard,
  CheckCircle2,
  Lock,
  Users,
  Truck,
  Package,
  Wallet,
  CircleDollarSign,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isSuper = user?.role === "SUPERADMIN";

  // Fetch real-time live system stats
  let stats = {
    customerCount: 0,
    supplierCount: 0,
    productCount: 0,
    orderCount: 0,
    saleCount: 0,
    outwardCount: 0,
    totalSalesAmount: 0,
    totalPayablesAmount: 0,
    totalStockUnits: 0,
  };

  try {
    const [
      custCount,
      suppCount,
      prodCount,
      ordCount,
      saleCount,
      outCount,
      salesAgg,
      suppAgg,
      stockAgg,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.sale.count(),
      prisma.inventoryOutward.count(),
      prisma.sale.aggregate({ _sum: { grandTotal: true } }),
      prisma.supplier.aggregate({ _sum: { payableBalance: true } }),
      prisma.stockBalance.aggregate({ _sum: { quantity: true } }),
    ]);

    stats = {
      customerCount: custCount,
      supplierCount: suppCount,
      productCount: prodCount,
      orderCount: ordCount,
      saleCount: saleCount,
      outwardCount: outCount,
      totalSalesAmount: Number(salesAgg._sum.grandTotal || 0),
      totalPayablesAmount: Number(suppAgg._sum.payableBalance || 0),
      totalStockUnits: Number(stockAgg._sum.quantity || 0),
    };
  } catch (e) {
    console.error("Dashboard stats fetch error:", e);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Welcome & Master Authority Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-brand-800/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {isSuper
                  ? "Root Authority Active • Full Unrestricted Master Control"
                  : `${user?.role} Policy Active`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
              AEVAN Cleaning Operating System. All 15 modules, financial ledgers, margins & stock
              operations are active and running on live PostgreSQL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isSuper ? (
              <Link
                href="/dashboard/permissions"
                className="inline-flex items-center gap-2 px-5 py-3 bg-brand-700 hover:bg-brand-600 active:scale-95 text-white font-bold rounded-2xl text-xs transition-all shadow-lg border border-brand-500/30"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Manage Permissions</span>
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs border border-slate-700">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Superadmin Governed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Real-Time Unlocked Financial & Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              ₹{stats.totalSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.saleCount} finalized sale(s)</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Accounts Payable</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-amber-700">
              ₹{stats.totalPayablesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Owed to {stats.supplierCount} vendor(s)</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inventory Stock</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.totalStockUnits.toLocaleString()} units
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across {stats.productCount} SKU(s)</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Customers & Partners</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.customerCount} Active
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Patna & Nalanda Regions</p>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Operations Hub */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Operations Command Hub</h2>
          <span className="text-xs text-brand-700 font-semibold">15 Modules Active</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/dashboard/outward"
            className="p-4 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-2xl transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="p-2.5 bg-white rounded-xl shadow-xs text-amber-700 group-hover:scale-110 transition-transform mb-2">
              <PackageMinus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Stock Outward</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Track Movements</span>
          </Link>

          <Link
            href="/dashboard/sales"
            className="p-4 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-2xl transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="p-2.5 bg-white rounded-xl shadow-xs text-emerald-700 group-hover:scale-110 transition-transform mb-2">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Sales & Invoices</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Sequential Invoices</span>
          </Link>

          <Link
            href="/dashboard/orders"
            className="p-4 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-2xl transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="p-2.5 bg-white rounded-xl shadow-xs text-blue-700 group-hover:scale-110 transition-transform mb-2">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Customer Orders</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Manage Bookings</span>
          </Link>

          <Link
            href="/dashboard/purchases/orders"
            className="p-4 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-2xl transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="p-2.5 bg-white rounded-xl shadow-xs text-indigo-700 group-hover:scale-110 transition-transform mb-2">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Procurement</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Vendor POs & GRN</span>
          </Link>

          <Link
            href="/dashboard/ledger"
            className="p-4 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-2xl transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="p-2.5 bg-white rounded-xl shadow-xs text-brand-700 group-hover:scale-110 transition-transform mb-2">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Client Ledger</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Statements & Aging</span>
          </Link>

          <Link
            href="/dashboard/expenses"
            className="p-4 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 border border-slate-200 rounded-2xl transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="p-2.5 bg-white rounded-xl shadow-xs text-purple-700 group-hover:scale-110 transition-transform mb-2">
              <CircleDollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Expenses</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Approve & Track</span>
          </Link>
        </div>
      </div>

      {/* 4. Superadmin Full Control Confirmation Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 text-xs text-emerald-950">
          <h3 className="text-sm font-bold text-emerald-900">
            Superadmin Master Access Level: 100% Unlocked
          </h3>
          <p className="leading-relaxed text-emerald-800">
            As Root Superadmin, you have full unrestricted access to all sensitive data including
            product cost prices, profit margins, complete financial ledgers, accounts payable,
            receivables, and user permissions. No permissions are required for Superadmin.
          </p>
          <p className="text-[11px] text-emerald-700 font-medium">
            Strict security policies (zero implicit permissions) apply exclusively to Admin and
            Staff accounts to ensure complete financial safety and segregation of duties.
          </p>
        </div>
      </div>
    </div>
  );
}
