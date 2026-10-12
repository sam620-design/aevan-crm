import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPurchaseOrders, createPurchaseOrder } from "@/lib/services/purchase.service";
import { createPurchaseOrderSchema } from "@/lib/validations/purchase.schema";
import { PurchaseOrderStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as PurchaseOrderStatus) || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getPurchaseOrders(user, { search, status, supplierId, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch purchase orders" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = createPurchaseOrderSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const po = await createPurchaseOrder(user, parse.data);
    return NextResponse.json({ success: true, purchaseOrder: po }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to create purchase order" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
