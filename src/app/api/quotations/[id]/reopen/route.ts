import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reopenQuotation } from "@/lib/services/quotation.service";
import { reopenQuotationSchema } from "@/lib/validations/quotation.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = reopenQuotationSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const quotation = await reopenQuotation(user, params.id, parse.data);
    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to reopen quotation" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
