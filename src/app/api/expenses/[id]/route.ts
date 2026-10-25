import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExpenseById, updateExpense, deleteExpense } from "@/lib/services/purchase.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const expense = await getExpenseById(user, params.id);
    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch expense" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const expense = await updateExpense(user, params.id, body);
    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update expense" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await deleteExpense(user, params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to delete expense" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
