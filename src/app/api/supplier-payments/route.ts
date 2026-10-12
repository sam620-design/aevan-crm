import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupplierPayments, createSupplierPayment } from "@/lib/services/purchase.service";
import { createSupplierPaymentSchema } from "@/lib/validations/purchase.schema";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getSupplierPayments(user, { search, supplierId, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch supplier payments" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createSupplierPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const payment = await createSupplierPayment(user, parsed.data);
    return NextResponse.json({ success: true, supplierPayment: payment }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to record supplier payment" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
