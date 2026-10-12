import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { finalizeSale } from "@/lib/services/sale.service";
import { finalizeSaleSchema } from "@/lib/validations/sale.schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let data;
    try {
      const body = await request.json();
      const parse = finalizeSaleSchema.safeParse(body);
      if (parse.success) data = parse.data;
    } catch {
      // Body is optional
    }

    const sale = await finalizeSale(user, params.id, data);
    return NextResponse.json({ success: true, sale });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to finalize sale" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
