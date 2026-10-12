import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import { ShieldCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell user={user}>
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-bold">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Operations Admin Portal • Explicit Permissions Enforced</span>
      </div>
      {children}
    </DashboardShell>
  );
}
