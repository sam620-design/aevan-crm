import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin, hasPermission } from "@/lib/permissions";
import { ModuleName, ActionName, SupplierBillStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuper = isSuperadmin(user);
    const canViewMargins =
      isSuper || (await hasPermission(user, ModuleName.REPORTS, ActionName.VIEW_PROFIT_MARGINS));

    // 1. Sales & Revenue
    const sales = await prisma.sale.findMany({
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, basePrice: true, costPrice: true } },
          },
        },
      },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
    const finalizedSalesCount = sales.filter((s) => s.isFinalized).length;

    // Receivables from Sales balanceAmount
    const totalReceivables = sales.reduce((sum, s) => sum + Number(s.balanceAmount || 0), 0);

    // 2. Cost of Goods Sold (COGS) & Profit
    let totalCOGS = 0;
    sales.forEach((s) => {
      s.items?.forEach((item) => {
        const unitCost = Number(item.product?.costPrice || 0);
        totalCOGS += unitCost * item.quantity;
      });
    });

    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPercent = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";

    // 3. Payables (Supplier liabilities)
    const bills = await prisma.supplierBill.findMany({
      where: { status: { in: [SupplierBillStatus.POSTED, SupplierBillStatus.PARTIALLY_PAID] } },
      select: { balanceAmount: true },
    });
    const totalPayables = bills.reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);

    // 4. Products & Inventory Valuation
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stockBalances: true,
      },
    });

    let totalStockUnits = 0;
    let inventoryRetailValue = 0;
    let inventoryCostValue = 0;

    const skuBreakdown = products.map((p) => {
      const units = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0);
      const base = Number(p.basePrice || 0);
      const cost = Number(p.costPrice || 0);
      const profitPerUnit = base - cost;
      const marginPct = base > 0 && cost > 0 ? ((profitPerUnit / base) * 100).toFixed(1) : "0.0";

      totalStockUnits += units;
      inventoryRetailValue += units * base;
      inventoryCostValue += units * cost;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        units,
        basePrice: base,
        costPrice: canViewMargins ? cost : null,
        profitPerUnit: canViewMargins ? profitPerUnit : null,
        marginPct: canViewMargins ? marginPct : null,
      };
    });

    return NextResponse.json({
      success: true,
      isSuperadmin: isSuper,
      marginsUnlocked: canViewMargins,
      metrics: {
        totalRevenue,
        finalizedSalesCount,
        totalCOGS: canViewMargins ? totalCOGS : null,
        grossProfit: canViewMargins ? grossProfit : null,
        grossMarginPercent: canViewMargins ? grossMarginPercent : null,
        totalReceivables,
        totalPayables,
        totalStockUnits,
        inventoryRetailValue,
        inventoryCostValue: canViewMargins ? inventoryCostValue : null,
      },
      skuBreakdown,
    });
  } catch (error: any) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch report summary" }, { status: 500 });
  }
}
