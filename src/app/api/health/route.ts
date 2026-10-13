import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    superadminEmail: process.env.SUPERADMIN_EMAIL || "default",
    superadminPasswordLength: process.env.SUPERADMIN_PASSWORD?.length || 0,
    databaseUrlHost: process.env.DATABASE_URL ? process.env.DATABASE_URL.split("@")[1]?.split("/")[0] : null,
  };

  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      userCount,
      env: envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "degraded",
        database: "error",
        error: error.message || String(error),
        env: envCheck,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
