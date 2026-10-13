"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldPlus,
  Trash2,
  UserPlus,
  History,
  CheckCircle2,
  AlertCircle,
  Shield,
  Clock,
} from "lucide-react";
import StaffAccessManager from "./StaffAccessManager";

const MODULES = [
  "DASHBOARD",
  "CUSTOMERS",
  "ORDERS",
  "SALES",
  "QUOTATIONS",
  "SERVICES",
  "PAYMENTS",
  "CUSTOMER_LEDGER",
  "INVENTORY",
  "INVENTORY_OUTWARD",
  "STOCK_TRANSFERS",
  "FOLLOWUPS_TASKS",
  "REPORTS",
  "DOCUMENTS",
  "USER_PERMISSIONS",
  "COMPANY_CONFIG",
];

const ACTIONS = [
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "APPROVE",
  "REJECT",
  "ASSIGN",
  "REOPEN",
  "CHANGE_PRICE",
  "APPLY_DISCOUNT",
  "APPROVE_EXCEPTION",
  "CREATE_SALE",
  "CONVERT_ORDER_TO_SALE",
  "MANAGE_CUSTOMERS",
  "RECORD_PAYMENT",
  "VERIFY_PAYMENT",
  "EDIT_PAYMENT",
  "ALLOCATE_PAYMENT",
  "REVERSE_PAYMENT",
  "MANAGE_INVENTORY",
  "CREATE_OUTWARD",
  "TRANSFER_STOCK",
  "APPROVE_DISCREPANCY",
  "MANAGE_LOCATIONS",
  "VIEW_REPORTS",
  "VIEW_PROFIT_MARGINS",
  "DOWNLOAD_DOCUMENTS",
  "EXPORT_DATA",
];

const SCOPES = ["OWN", "ASSIGNED", "ALL"];

export default function PermissionsManagerClient({
  initialUsers,
  initialAuditLogs,
}: {
  initialUsers: any[];
  initialAuditLogs: any[];
}) {
  const router = useRouter();

  // Create User Form State
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("STAFF");
  const [creatingUser, setCreatingUser] = useState(false);

  // Grant Permission Form State
  const [selectedUserId, setSelectedUserId] = useState(
    initialUsers.find((u) => u.role !== "SUPERADMIN")?.id || ""
  );
  const [selectedModule, setSelectedModule] = useState(MODULES[1]);
  const [selectedAction, setSelectedAction] = useState(ACTIONS[0]);
  const [selectedScope, setSelectedScope] = useState(SCOPES[0]);
  const [auditReason, setAuditReason] = useState("");
  const [grantingPermission, setGrantingPermission] = useState(false);

  // Status message
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setCreatingUser(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          password: userPassword,
          role: userRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to create user." });
        setCreatingUser(false);
        return;
      }

      setMessage({ type: "success", text: `User ${userName} created successfully.` });
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error during user creation." });
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleGrantPermission(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) {
      setMessage({ type: "error", text: "Please select a target user." });
      return;
    }
    if (!auditReason.trim() || auditReason.trim().length < 5) {
      setMessage({
        type: "error",
        text: "Mandatory audit reason must be at least 5 characters.",
      });
      return;
    }

    setMessage(null);
    setGrantingPermission(true);

    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          module: selectedModule,
          action: selectedAction,
          scope: selectedScope,
          reason: auditReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to grant permission." });
        setGrantingPermission(false);
        return;
      }

      setMessage({
        type: "success",
        text: `Permission ${selectedAction} on ${selectedModule} (${selectedScope}) recorded!`,
      });
      setAuditReason("");
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error during permission update." });
    } finally {
      setGrantingPermission(false);
    }
  }

  async function handleRevokePermission(targetUserId: string, module: string, action: string) {
    const reason = prompt(
      `Enter mandatory audit reason for revoking ${action} on ${module}:`
    );
    if (!reason || reason.trim().length < 5) {
      alert("Revocation cancelled: A valid audit reason of at least 5 characters is required.");
      return;
    }

    try {
      const res = await fetch("/api/permissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          module,
          action,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to revoke permission.");
        return;
      }

      alert("Permission revoked successfully with audit log.");
      router.refresh();
    } catch {
      alert("Network error during revocation.");
    }
  }

  const selectedUser = initialUsers.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-6 sm:space-y-8">
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Master Superadmin Unlocked Status Card */}
      <div className="bg-emerald-950 text-white rounded-3xl p-5 sm:p-6 border border-emerald-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-900 text-emerald-300 rounded-2xl border border-emerald-700/50">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">
                  Superadmin Account: 100% Master Access Unlocked
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  Root Authority
                </span>
              </div>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                No permissions required for Superadmin. Unrestricted control over all 15 modules, financial ledgers, margins, and policies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-800 self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-200">Zero Permission Restrictions</span>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold mb-2">
            System Modules Controlled by Root Superadmin:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {[
              "1. Dashboard",
              "2. Customers",
              "3. Orders",
              "4. Sales",
              "5. Quotations",
              "6. Customer Payments",
              "7. Customer Ledger",
              "8. Receivables & Aging",
              "9. Suppliers",
              "10. Purchase Orders",
              "11. Goods Receiving (GRN)",
              "12. Supplier Bills",
              "13. Purchase Returns",
              "14. Supplier Payments",
              "15. Supplier Ledger",
              "16. Accounts Payable",
              "17. Operational Expenses",
              "18. Inventory & SKUs",
              "19. Stock Outward",
              "20. Stock Transfers",
            ].map((modName, idx) => (
              <div
                key={idx}
                className="bg-emerald-900/40 border border-emerald-800/60 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px]"
              >
                <span className="text-emerald-100 font-medium truncate">{modName}</span>
                <span className="text-[9px] text-emerald-400 font-bold ml-1">Unlocked</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Create User & Grant Permission Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Form 1: Create Admin / Staff */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Create New System User
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Admins and Staff are created with <strong>zero permissions</strong> by default.
          </p>

          <form onSubmit={handleCreateUser} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Rahul Kumar"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="staff@aevancleaning.com"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
                >
                  <option value="STAFF">STAFF (Zero Permissions)</option>
                  <option value="ADMIN">ADMIN (Zero Permissions)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingUser}
              className="w-full py-3 sm:py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow"
            >
              {creatingUser ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Form 2: Grant / Modify Fine-Grained Permission */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldPlus className="w-5 h-5 text-brand-700" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Grant / Modify Permission
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Every permission grant requires an audit reason and is enforced on the server.
          </p>

          <form onSubmit={handleGrantPermission} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
              >
                {initialUsers
                  .filter((u) => u.role !== "SUPERADMIN")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — [{u.role}]
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Module
                </label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
                >
                  {MODULES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
                >
                  {ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Scope
                </label>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
                >
                  {SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Audit Reason
              </label>
              <input
                type="text"
                required
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="e.g. Field dispatch lead for Nalanda district"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-xs focus:outline-none focus:border-brand-600"
              />
            </div>

            <button
              type="submit"
              disabled={grantingPermission}
              className="w-full py-3 sm:py-2.5 px-4 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow"
            >
              {grantingPermission ? "Saving Permission..." : "Authorize & Record Permission"}
            </button>
          </form>
        </div>
      </div>

      {/* Permissions Matrix for Selected User */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              User Permission Inspection Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Inspect active authorities and explicit permissions for any system account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Select User:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-600"
            >
              {initialUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedUser && selectedUser.role === "SUPERADMIN" ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Account: {selectedUser.name} ({selectedUser.email})
                </span>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Role: <strong>ROOT SUPERADMIN</strong> • Status: <strong>100% UNLOCKED</strong>
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black border border-emerald-300">
                ROOT PRIVILEGES
              </span>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              Superadmin is the supreme system authority. By architectural design, Superadmin requires zero database permission records because all 15 modules, profit margins, cost prices, financial ledgers, and database operations are permanently unlocked.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
              {MODULES.map((m) => (
                <div
                  key={m}
                  className="bg-white border border-emerald-200 p-2 rounded-xl text-[11px] flex items-center justify-between shadow-xs"
                >
                  <span className="font-semibold text-slate-800">{m}</span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    ALL (ROOT)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : selectedUser ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800">
                {selectedUser.name} ({selectedUser.email}) — [{selectedUser.role}]
              </span>
              <span className="text-xs text-slate-500">
                Explicitly granted permissions: {selectedUser.permissions?.length || 0}
              </span>
            </div>

            {selectedUser.permissions?.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 text-slate-500 text-xs text-center border border-dashed border-slate-200">
                No permissions granted yet. This user has ZERO implicit permissions and is strictly restricted until Superadmin grants explicit access above.
              </div>
            ) : (
              <div>
                {/* Mobile Cards (Phones) */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden">
                  {selectedUser.permissions.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{p.module}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-brand-800 font-bold">
                            {p.action}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            {p.scope}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokePermission(selectedUser.id, p.module, p.action)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Revoke Permission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Scope</th>
                        <th className="py-2.5 px-3 text-right">Revoke</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedUser.permissions.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{p.module}</td>
                          <td className="py-2.5 px-3 text-brand-800 font-mono font-medium">{p.action}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {p.scope}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRevokePermission(selectedUser.id, p.module, p.action)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Revoke Permission"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Admin-to-Staff Data Visibility & Supervision Control */}
      <StaffAccessManager users={initialUsers} />

      {/* Permission Audit Trail Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-slate-700" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Permission Audit Trail
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Tamper-evident audit log of all permission grants, modifications, and revocations.
        </p>

        {initialAuditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No permission alterations recorded yet.</p>
        ) : (
          <div>
            {/* Mobile Cards for Audit Trail (Phones) */}
            <div className="grid grid-cols-1 gap-2.5 md:hidden">
              {initialAuditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.changeType === "GRANT"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.changeType === "MODIFY"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.changeType}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {log.module} • {log.action}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Target: <strong>{log.targetUser?.name || "User"}</strong> | Scope:{" "}
                    {log.previousScope || "NONE"} &rarr; {log.newScope || "NONE"}
                  </p>
                  <p className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                    &quot;{log.reason}&quot;
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Table (Tablets / Laptops) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Author</th>
                    <th className="py-2.5 px-3">Target User</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Module & Action</th>
                    <th className="py-2.5 px-3">Scope Change</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {initialAuditLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">
                        {log.changedByUser?.name || "Superadmin"}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">
                        {log.targetUser?.name || "Unknown"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.changeType === "GRANT"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.changeType === "MODIFY"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.changeType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-900 font-semibold">
                        {log.module} • {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {log.previousScope || "NONE"} &rarr; {log.newScope || "NONE"}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600 italic">
                        &quot;{log.reason}&quot;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
