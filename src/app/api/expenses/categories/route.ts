import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExpenseCategories } from "@/lib/services/purchase.service";

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
