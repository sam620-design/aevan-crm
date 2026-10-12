import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInvoiceDocument } from "@/lib/services/sale.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoice = await getInvoiceDocument(user, params.id);
    return NextResponse.json({ invoice });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to generate invoice document" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
