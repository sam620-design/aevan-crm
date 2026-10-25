import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSaleById, deleteSale } from "@/lib/services/sale.service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sale = await getSaleById(user, params.id);
    return NextResponse.json({ sale });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch sale" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await deleteSale(user, params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to delete sale" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

