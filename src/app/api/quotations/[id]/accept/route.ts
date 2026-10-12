import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptQuotation } from "@/lib/services/quotation.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quotation = await acceptQuotation(user, params.id);
    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to accept quotation" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
