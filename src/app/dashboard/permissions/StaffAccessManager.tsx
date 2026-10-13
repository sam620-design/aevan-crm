"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Eye,
  Briefcase,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  AlertCircle,
  UserCheck,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
}

interface GrantItem {
  id: string;
  adminId: string;
  staffId: string;
  accessType: "VIEW" | "MANAGEMENT_ASSIGNMENT";
  isActive: boolean;
  grantedById: string;
  grantedAt?: string;
  createdAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  admin: UserItem;
  staff: UserItem;
  grantedBy: { id: string; name: string; email: string };
}

export default function StaffAccessManager({
  users,
}: {
  users: UserItem[];
}) {
  const [grants, setGrants] = useState<GrantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const admins = users.filter((u) => u.role === "ADMIN");
  const staffMembers = users.filter((u) => u.role === "STAFF");

  const [selectedAdminId, setSelectedAdminId] = useState<string>(
    admins[0]?.id || ""
  );
  const [searchStaff, setSearchStaff] = useState("");
  const [processing, setProcessing] = useState(false);

  // Revocation modal state
  const [revokeModal, setRevokeModal] = useState<{
    adminId: string;
    staffId: string;
    staffName: string;
    accessType: "VIEW" | "MANAGEMENT_ASSIGNMENT";
  } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  useEffect(() => {
    fetchGrants();
  }, []);

  async function fetchGrants() {
    setLoading(true);
    try {
      const res = await fetch("/api/staff-access");
      if (res.ok) {
        const data = await res.json();
        setGrants(data.grants || []);
      }
    } catch (err: any) {
      console.error("Failed to load staff access grants:", err);
    } finally {
      setLoading(false);
    }
  }

  const selectedAdmin = admins.find((a) => a.id === selectedAdminId);

  // Filter staff by search keyword
  const filteredStaff = staffMembers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStaff.toLowerCase()) ||
      s.email.toLowerCase().includes(searchStaff.toLowerCase())
  );

  // Helper to check if an active grant exists
  const hasActiveGrant = (
    adminId: string,
    staffId: string,
    accessType: "VIEW" | "MANAGEMENT_ASSIGNMENT"
  ) => {
    return grants.some(
      (g) =>
        g.adminId === adminId &&
        g.staffId === staffId &&
        g.accessType === accessType &&
        g.isActive
    );
  };

  const handleGrantAccess = async (
    staffId: string,
    accessType: "VIEW" | "MANAGEMENT_ASSIGNMENT"
  ) => {
    if (!selectedAdminId) return;

    const reason = prompt(
      `Enter reason for granting Admin (${selectedAdmin?.name}) ${accessType} access to Staff member:`,
      `Authorized operational ${accessType.toLowerCase()} by Superadmin`
    );

    if (!reason || reason.trim().length < 3) {
      alert("A valid reason of at least 3 characters is required.");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/staff-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: selectedAdminId,
          staffId,
          accessType,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to grant staff access");
      }

      setSuccessMessage(`Successfully granted ${accessType} access.`);
      fetchGrants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeModal || !revokeReason || revokeReason.trim().length < 3) {
      alert("Revocation reason must be at least 3 characters.");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/staff-access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: revokeModal.adminId,
          staffId: revokeModal.staffId,
          accessType: revokeModal.accessType,
          reason: revokeReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke staff access");
      }

      setSuccessMessage(`Successfully revoked ${revokeModal.accessType} access.`);
      setRevokeModal(null);
      setRevokeReason("");
      fetchGrants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Admin-to-Staff Data Visibility & Supervision Control
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Superadmin explicitly governs which Staff members&apos; Services and operational records each Admin can view or manage.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-100">
          <ShieldAlert className="w-4 h-4 text-indigo-600" />
          <span>Superadmin Protected Boundary</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Admin Selector & Staff Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Select Admin to Configure:
          </label>
          {admins.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No Admin accounts found. Create an Admin account first.</p>
          ) : (
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Filter Staff Members:
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={searchStaff}
              onChange={(e) => setSearchStaff(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Staff Permission Control Matrix */}
      {selectedAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Staff Visibility Matrix for: <span className="text-slate-900">{selectedAdmin.name}</span>
            </h4>
            <span className="text-xs text-slate-500">
              {staffMembers.length} Total Staff Members in CRM
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400 italic">
                No staff members match your search query.
              </p>
            ) : (
              filteredStaff.map((staff) => {
                const hasView = hasActiveGrant(selectedAdmin.id, staff.id, "VIEW");
                const hasManagement = hasActiveGrant(
                  selectedAdmin.id,
                  staff.id,
                  "MANAGEMENT_ASSIGNMENT"
                );

                return (
                  <div
                    key={staff.id}
                    className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{staff.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                          STAFF
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{staff.email}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* VIEW ACCESS CONTROL */}
                      {hasView ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl">
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-semibold text-[11px]">View Active</span>
                          <button
                            onClick={() =>
                              setRevokeModal({
                                adminId: selectedAdmin.id,
                                staffId: staff.id,
                                staffName: staff.name,
                                accessType: "VIEW",
                              })
                            }
                            className="ml-1 text-emerald-600 hover:text-rose-600 text-xs font-bold"
                            title="Revoke View Access"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGrantAccess(staff.id, "VIEW")}
                          disabled={processing}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200/80"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Grant View Access</span>
                        </button>
                      )}

                      {/* MANAGEMENT ASSIGNMENT CONTROL */}
                      {hasManagement ? (
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-xl">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-semibold text-[11px]">Assigned Supervisor</span>
                          <button
                            onClick={() =>
                              setRevokeModal({
                                adminId: selectedAdmin.id,
                                staffId: staff.id,
                                staffName: staff.name,
                                accessType: "MANAGEMENT_ASSIGNMENT",
                              })
                            }
                            className="ml-1 text-indigo-600 hover:text-rose-600 text-xs font-bold"
                            title="Revoke Management Assignment"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGrantAccess(staff.id, "MANAGEMENT_ASSIGNMENT")}
                          disabled={processing}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors border border-slate-200/80"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>Assign Supervisor</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Active Grants Audit History Table */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Admin-to-Staff Access Audit Trail (Active & Revoked)
        </h4>

        {grants.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No access grants recorded yet.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Staff Subject</th>
                  <th className="py-2.5 px-3">Access Level</th>
                  <th className="py-2.5 px-3">Granted By</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Revocation Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grants.slice(0, 15).map((grant) => (
                  <tr key={grant.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      {grant.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          REVOKED
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {grant.admin?.name || "Admin"}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {grant.staff?.name || "Staff"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          grant.accessType === "VIEW"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {grant.accessType === "VIEW" ? "View Records" : "Management Supervision"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {grant.grantedBy?.name || "Superadmin"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(grant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                      {grant.revocationReason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke Confirmation Modal */}
      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-base">Confirm Access Revocation</h3>
            </div>

            <p className="text-xs text-slate-600">
              You are revoking <strong>{revokeModal.accessType}</strong> access for Admin over Staff member{" "}
              <strong>{revokeModal.staffName}</strong>. The Admin will immediately lose access to this Staff member&apos;s records.
            </p>

            <form onSubmit={handleConfirmRevoke} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason (min 3 characters):
                </label>
                <textarea
                  required
                  rows={2}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Reassigned to different regional team"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevokeModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
                >
                  {processing ? "Revoking..." : "Confirm Revoke"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
