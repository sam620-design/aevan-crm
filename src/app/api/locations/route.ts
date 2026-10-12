import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLocations, createLocation } from "@/lib/services/location.service";
import { locationSchema } from "@/lib/validations/stock.schema";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const locations = await getLocations(user);
    return NextResponse.json({ locations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = locationSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const location = await createLocation(user, parse.data);
    return NextResponse.json({ success: true, location }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to create location" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
