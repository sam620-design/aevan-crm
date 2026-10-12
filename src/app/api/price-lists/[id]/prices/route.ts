import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setProductPrice } from "@/lib/services/priceList.service";
import { productPriceSchema } from "@/lib/validations/priceList.schema";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = productPriceSchema.safeParse({ ...body, priceListId: params.id });
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const price = await setProductPrice(user, parse.data);
    return NextResponse.json({ success: true, price });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to set product price" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
