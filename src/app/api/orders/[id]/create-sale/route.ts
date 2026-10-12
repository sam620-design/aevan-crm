import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSaleFromOrder } from "@/lib/services/sale.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sale = await createSaleFromOrder(user, params.id);
    return NextResponse.json({ success: true, sale }, { status: 201 });
  } catch (error: any) {
    const isConflict = error.message?.startsWith("CONFLICT");
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to convert order to sale" },
      { status: isConflict ? 409 : isForbidden ? 403 : 400 }
    );
  }
}
