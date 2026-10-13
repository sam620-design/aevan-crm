import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Load active permissions if not superadmin
    let permissions: any[] = [];
    if (user.role === "SUPERADMIN") {
      permissions = [{ all: true, description: "Full Root Superadmin Permissions" }];
    } else {
      try {
        permissions = await prisma.permission.findMany({
          where: { userId: user.id },
          select: {
            module: true,
            action: true,
            scope: true,
          },
        });
      } catch (err) {
        console.warn("Could not query permissions from DB:", err);
      }

      // Default Staff permissions for Services and Sales
      if (user.role === "STAFF" && permissions.length === 0) {
        permissions = [
          { module: "SERVICES", action: "VIEW", scope: "OWN" },
          { module: "SERVICES", action: "CREATE", scope: "OWN" },
          { module: "SERVICES", action: "EDIT", scope: "OWN" },
          { module: "SALES", action: "VIEW", scope: "OWN" },
          { module: "SALES", action: "CREATE", scope: "OWN" },
        ];
      }
    }

    return NextResponse.json({
      authenticated: true,
      user,
      permissions,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
