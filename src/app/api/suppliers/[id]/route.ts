import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupplierById, updateSupplier, deactivateSupplier } from "@/lib/services/purchase.service";
import { updateSupplierSchema } from "@/lib/validations/purchase.schema";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supplier = await getSupplierById(user, params.id);
    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to fetch supplier" },
      { status: isForbidden ? 403 : 404 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = updateSupplierSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const supplier = await updateSupplier(user, params.id, parse.data);
    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to update supplier" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supplier = await deactivateSupplier(user, params.id);
    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to deactivate supplier" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
