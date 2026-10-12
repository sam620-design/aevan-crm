import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";
import { ShieldCheck } from "lucide-react";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell user={user}>
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-200 text-slate-800 border border-slate-300 rounded-full text-xs font-bold">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Field Staff Portal • Scoped Operations</span>
      </div>
      {children}
    </DashboardShell>
  );
}
