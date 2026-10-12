import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { approveExpense } from "@/lib/services/purchase.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expense = await approveExpense(user, params.id);
    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to approve expense" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
