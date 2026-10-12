import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSaleById } from "@/lib/services/sale.service";

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
