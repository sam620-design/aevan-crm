import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProduct } from "@/lib/services/product.service";
import { updateProductSchema } from "@/lib/validations/product.schema";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = updateProductSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const updated = await updateProduct(user, params.id, parse.data);
    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
