import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rejectQuotation } from "@/lib/services/quotation.service";
import { rejectQuotationSchema } from "@/lib/validations/quotation.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let data;
    try {
      const body = await request.json();
      const parse = rejectQuotationSchema.safeParse(body);
      if (parse.success) data = parse.data;
    } catch {
      // Body is optional
    }

    const quotation = await rejectQuotation(user, params.id, data);
    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to reject quotation" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
