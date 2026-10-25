import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuotationById, updateQuotation, deleteQuotation } from "@/lib/services/quotation.service";

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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const updated = await updateQuotation(user, params.id, body);
    return NextResponse.json({ success: true, quotation: updated });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update quotation" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await deleteQuotation(user, params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to delete quotation" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

