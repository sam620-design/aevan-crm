import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuotationById } from "@/lib/services/quotation.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quotation = await getQuotationById(user, params.id);
    return NextResponse.json({ quotation });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotation" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}
