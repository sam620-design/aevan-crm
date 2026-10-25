import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExpenseCategories, createExpenseCategory } from "@/lib/services/purchase.service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const categories = await getExpenseCategories(user);
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch expense categories" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const category = await createExpenseCategory(user, body);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to create expense category" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
