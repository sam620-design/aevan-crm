import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { issueQuotation } from "@/lib/services/quotation.service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quotation = await issueQuotation(user, params.id);
    return NextResponse.json({ success: true, quotation });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to issue quotation" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
