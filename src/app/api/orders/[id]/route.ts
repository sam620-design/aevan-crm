import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById, updateOrder, deleteOrder } from "@/lib/services/order.service";
import { updateOrderSchema } from "@/lib/validations/order.schema";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await getOrderById(user, params.id);
    return NextResponse.json({ order });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch order" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = updateOrderSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const updated = await updateOrder(user, params.id, parse.data);
    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update order" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await deleteOrder(user, params.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to delete order" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
