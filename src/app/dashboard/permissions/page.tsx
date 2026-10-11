import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, ShieldAlert, UserPlus, History, Lock } from "lucide-react";
import PermissionsManagerClient from "./PermissionsManagerClient";

export default async function PermissionsPage() {
  const currentUser = await getCurrentUser();

  if (currentUser?.role !== "SUPERADMIN") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-xl mx-auto mt-12">
        <Lock className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-red-950 mb-2">Access Denied</h2>
        <p className="text-sm text-red-800">
          Under AEVAN Cleaning CRM Global Security Policy, only <strong>Superadmin</strong> is authorized to view or configure permissions.
        </p>
      </div>
    );
  }

  // Fetch users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      permissions: {
        select: {
          id: true,
          module: true,
          action: true,
          scope: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch recent permission audit log entries
  const auditLogs = await prisma.permissionAuditLog.findMany({
    include: {
      targetUser: { select: { name: true, email: true } },
      changedByUser: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Policy Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Global Permission Hierarchy & Control
            </h2>
            <p className="text-xs text-slate-500">
              Superadmin exclusive root authority. Admins and Staff receive no implicit permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Client Component for User Creation, Permission Assignment & Matrix */}
      <PermissionsManagerClient initialUsers={users} initialAuditLogs={auditLogs} />
    </div>
  );
}
