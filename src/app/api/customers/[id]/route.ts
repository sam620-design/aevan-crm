import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerById, updateCustomer } from "@/lib/services/customer.service";
import { updateCustomerSchema } from "@/lib/validations/customer.schema";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const customer = await getCustomerById(user, params.id);
    return NextResponse.json({ customer });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Customer not found" },
      { status: isForbidden ? 403 : 404 }
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
    const parse = updateCustomerSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const updated = await updateCustomer(user, params.id, parse.data);
    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update customer" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
