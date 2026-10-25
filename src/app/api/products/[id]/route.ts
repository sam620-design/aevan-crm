import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateProduct, getProductById, deleteProduct } from "@/lib/services/product.service";
import { updateProductSchema } from "@/lib/validations/product.schema";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const product = await getProductById(user, params.id);
    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch product" },
      { status: isForbidden ? 403 : error.message?.includes("not found") ? 404 : 500 }
    );
  }
}

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await deleteProduct(user, params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to delete product" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
