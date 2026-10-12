import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deactivateLocation } from "@/lib/services/location.service";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deactivated = await deactivateLocation(user, params.id);
    return NextResponse.json({ success: true, location: deactivated });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to deactivate location" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
