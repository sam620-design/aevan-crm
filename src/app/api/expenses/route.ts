import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExpenses, createExpense } from "@/lib/services/purchase.service";
import { createExpenseSchema } from "@/lib/validations/purchase.schema";
import { ExpenseStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = (searchParams.get("status") as ExpenseStatus) || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getExpenses(user, { search, categoryId, status, page, limit });
    return NextResponse.json({ success: true, ...result, expenses: result.items });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch expenses" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const expense = await createExpense(user, parsed.data);
    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to create expense" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
