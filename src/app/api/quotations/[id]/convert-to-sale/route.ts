import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { convertQuotationToSale } from "@/lib/services/quotation.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sale = await convertQuotationToSale(user, params.id);
    return NextResponse.json({ success: true, sale }, { status: 201 });
  } catch (error: any) {
    const isConflict = error.message?.startsWith("CONFLICT");
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to convert quotation to sale" },
      { status: isConflict ? 409 : isForbidden ? 403 : 400 }
    );
  }
}
