import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStockBalances, recordStockInward } from "@/lib/services/stock.service";
import { stockInwardSchema } from "@/lib/validations/stock.schema";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId") || undefined;
    const productId = searchParams.get("productId") || undefined;

    const balances = await getStockBalances(user, { locationId, productId });
    return NextResponse.json({ balances });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch stock balances" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = stockInwardSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const result = await recordStockInward(user, parse.data);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to record inward stock" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
