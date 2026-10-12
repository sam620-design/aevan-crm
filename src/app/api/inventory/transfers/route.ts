import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeStockTransfer } from "@/lib/services/stock.service";
import { stockTransferSchema } from "@/lib/validations/stock.schema";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ModuleName, ActionName } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canView = await hasPermission(user, ModuleName.STOCK_TRANSFERS, ActionName.VIEW);
    if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const transfers = await prisma.stockTransfer.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        sourceLocation: { select: { id: true, name: true, code: true } },
        destinationLocation: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transfers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch transfers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parse = stockTransferSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parse.error.errors },
        { status: 400 }
      );
    }

    const result = await executeStockTransfer(user, parse.data);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error: any) {
    const isForbidden = error.message?.startsWith("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed to execute stock transfer" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
