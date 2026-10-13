"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Receipt,
  FileText,
  CreditCard,
  BookOpen,
  CircleDollarSign,
  Package,
  PackageMinus,
  ArrowLeftRight,
  CalendarCheck,
  BarChart3,
  FolderArchive,
  ShieldAlert,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronRight,
  Truck,
  ShoppingBag,
  PackageCheck,
  FileSpreadsheet,
  Undo2,
  Wallet,
  Sparkles,
} from "lucide-react";
import { SessionUser } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

export default function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSuper = user.role === "SUPERADMIN";
  const isStaff = user.role === "STAFF";

  const staffNavItems: NavItem[] = [
    { label: "Cleaning Services", href: "/dashboard/services", icon: Sparkles },
    { label: "Sales", href: "/dashboard/sales", icon: Receipt },
  ];

  const fullNavItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Cleaning Services", href: "/dashboard/services", icon: Sparkles },
    { label: "Customers", href: "/dashboard/customers", icon: Users },
    { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
    { label: "Sales", href: "/dashboard/sales", icon: Receipt },
    { label: "Quotations", href: "/dashboard/quotations", icon: FileText },
    { label: "Customer Payments", href: "/dashboard/payments", icon: CreditCard },
    { label: "Customer Ledger", href: "/dashboard/ledger", icon: BookOpen },
    { label: "Receivables & Aging", href: "/dashboard/receivables", icon: CircleDollarSign },
    { label: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
    { label: "Purchase Orders", href: "/dashboard/purchases/orders", icon: ShoppingBag },
    { label: "Goods Receiving (GRN)", href: "/dashboard/purchases/receiving", icon: PackageCheck },
    { label: "Supplier Bills", href: "/dashboard/purchases/bills", icon: FileSpreadsheet },
    { label: "Purchase Returns", href: "/dashboard/purchases/returns", icon: Undo2 },
    { label: "Supplier Payments", href: "/dashboard/supplier-payments", icon: CreditCard },
    { label: "Supplier Ledger", href: "/dashboard/supplier-ledger", icon: BookOpen },
    { label: "Accounts Payable", href: "/dashboard/accounts-payable", icon: Wallet },
    { label: "Expenses", href: "/dashboard/expenses", icon: CircleDollarSign },
    { label: "Inventory", href: "/dashboard/inventory", icon: Package },
    { label: "Inventory Outward", href: "/dashboard/outward", icon: PackageMinus },
    { label: "Stock Transfers", href: "/dashboard/transfers", icon: ArrowLeftRight },
    { label: "Follow-ups & Tasks", href: "/dashboard/followups", icon: CalendarCheck },
    { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { label: "Documents", href: "/dashboard/documents", icon: FolderArchive },
    {
      label: "Permissions & Users",
      href: "/dashboard/permissions",
      icon: ShieldAlert,
      badge: isSuper ? "Root Master" : "Restricted",
    },
    { label: "CRM Configuration", href: "/dashboard/settings", icon: Settings },
  ];

  const navItems = isStaff ? staffNavItems : fullNavItems;

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-slate-100 text-slate-800">
      {/* ------------------------------------------------------------- */}
      {/* 1. MOBILE TOP APP BAR (Phones only) */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between md:hidden shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-xl active:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center text-brand-300 font-bold border border-brand-500/30">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">AEVAN CRM</p>
              <p className="text-[10px] text-brand-400 font-medium">GOOD TOUCH</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
              user.role === "SUPERADMIN"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                : user.role === "ADMIN"
                ? "bg-blue-950 text-blue-300 border border-blue-800"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {user.role}
          </span>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. MOBILE SLIDE-OUT DRAWER / SHEET */}
      {/* ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-slate-900 text-slate-300 flex flex-col h-full shadow-2xl z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center text-brand-300 font-bold border border-brand-500/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">AEVAN Cleaning</h3>
                  <p className="text-[10px] text-brand-400">All Modules</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white active:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile in Drawer */}
            <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>

            {/* Drawer Nav Links (Separately scrollable) */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-1 overscroll-contain sidebar-scroll">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-3 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-brand-900/60 text-white font-semibold border border-brand-700/50"
                        : "text-slate-300 hover:text-white active:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>
                        {index + 1}. {item.label}
                      </span>
                    </div>
                    {item.badge ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Logout in Drawer */}
            <div className="p-3 border-t border-slate-800 shrink-0">
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium text-red-400 bg-red-950/30 border border-red-900/40 active:bg-red-950/60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. DESKTOP SIDEBAR (Separately Scrollable Options Menu) */}
      {/* ------------------------------------------------------------- */}
      <aside className="hidden md:flex w-64 lg:w-72 h-screen max-h-screen bg-slate-900 border-r border-slate-800 flex-col shrink-0 text-slate-300 sticky top-0 overflow-hidden select-none">
        {/* Brand / Logo Header (Fixed at top of sidebar) */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center text-brand-300 shrink-0 font-bold border border-brand-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-white text-base leading-tight tracking-tight">
              AEVAN Cleaning
            </h2>
            <p className="text-xs text-brand-400 font-medium">GOOD TOUCH Formulations</p>
          </div>
        </div>

        {/* Separately Scrollable Options Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain sidebar-scroll">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors group ${
                  isActive
                    ? "bg-brand-900/60 text-white font-semibold border border-brand-700/50"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-brand-400 transition-colors" />
                  <span>
                    {index + 1}. {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isSuper
                        ? "bg-brand-900/80 text-brand-300 border border-brand-700/50"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Sign Out Footer (Fixed at bottom of sidebar) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                user.role === "SUPERADMIN"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : user.role === "ADMIN"
                  ? "bg-blue-950 text-blue-300 border border-blue-800"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {user.role}
            </span>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-950/40 border border-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN CONTENT AREA (Independently Scrollable) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:max-h-screen md:overflow-hidden pb-20 md:pb-0">
        {/* Desktop Header Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Enterprise CRM & Inventory Engine
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Security Access Level</p>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                {user.role === "SUPERADMIN"
                  ? "Root Superadmin • 100% Unlocked (Zero Restrictions)"
                  : `${user.role} (Explicit Permissions Only)`}
              </p>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content (Separately scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 overscroll-contain">{children}</main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MOBILE BOTTOM THUMB NAVIGATION (Phones only) */}
      {/* ------------------------------------------------------------- */}
      {isStaff ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around md:hidden px-4 shadow-2xl">
          <Link
            href="/dashboard/services"
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-semibold transition-colors ${
              pathname.startsWith("/dashboard/services") ? "text-brand-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5" />
            <span>Services</span>
          </Link>

          <Link
            href="/dashboard/sales"
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-semibold transition-colors ${
              pathname.startsWith("/dashboard/sales") ? "text-brand-400 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span>Sales</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-16 h-full py-1 text-xs font-medium text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>Menu</span>
          </button>
        </nav>
      ) : (
        <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around md:hidden px-2 shadow-2xl">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors ${
              pathname === "/dashboard" ? "text-brand-400 font-bold" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span>Home</span>
          </Link>

          <Link
            href="/dashboard/sales"
            className={`flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors ${
              pathname === "/dashboard/sales" ? "text-brand-400 font-bold" : "text-slate-400"
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span>Sales</span>
          </Link>

          <Link
            href="/dashboard/outward"
            className={`flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors ${
              pathname === "/dashboard/outward" ? "text-brand-400 font-bold" : "text-slate-400"
            }`}
          >
            <PackageMinus className="w-5 h-5 mb-0.5" />
            <span>Outward</span>
          </Link>

          <Link
            href="/dashboard/customers"
            className={`flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium transition-colors ${
              pathname === "/dashboard/customers" ? "text-brand-400 font-bold" : "text-slate-400"
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>Clients</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-14 h-full py-1 text-[10px] font-medium text-slate-400 active:text-brand-400"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>
        </nav>
      )}
    </div>
  );
}
