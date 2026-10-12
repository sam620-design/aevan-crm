import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoodsReceipts, createGoodsReceipt } from "@/lib/services/purchase.service";
import { createGoodsReceiptSchema } from "@/lib/validations/purchase.schema";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const locationId = searchParams.get("locationId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getGoodsReceipts(user, { search, supplierId, locationId, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch goods receipts" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createGoodsReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const grn = await createGoodsReceipt(user, parsed.data);
    return NextResponse.json({ success: true, goodsReceipt: grn }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to create goods receipt" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
