import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import { ShieldCheck } from "lucide-react";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  return (
    <DashboardShell user={user}>
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-bold">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Root Superadmin Portal • Exclusive Policy Authority</span>
      </div>
      {children}
    </DashboardShell>
  );
}
