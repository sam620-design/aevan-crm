import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPriceLists, createPriceList } from "@/lib/services/priceList.service";
import { priceListSchema } from "@/lib/validations/priceList.schema";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const priceLists = await getPriceLists(user);
    return NextResponse.json({ priceLists });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch price lists" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = priceListSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const priceList = await createPriceList(user, parse.data);
    return NextResponse.json({ success: true, priceList }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to create price list" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
