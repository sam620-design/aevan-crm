import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let config = await prisma.companyConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      config = await prisma.companyConfig.create({
        data: {
          id: "default",
          companyName: "AEVAN Cleaning",
          brandName: "GOOD TOUCH",
          gstin: "10XXXXX0000X1Z5",
          phone: "+91-7061101285",
          email: "info@aevancleaning.com",
          address: "Bihar Sharif, Nalanda, Bihar - 803111",
        },
      });
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      companyName,
      brandName,
      gstin,
      phone,
      email,
      address,
      invoicePrefix,
      orderPrefix,
      salePrefix,
      quotationPrefix,
      outwardPrefix,
      paymentPrefix,
      receiptPrefix,
      supplierPrefix,
      poPrefix,
    } = body;

    const existing = await prisma.companyConfig.findUnique({ where: { id: "default" } });

    const updated = await prisma.companyConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        companyName: companyName || "AEVAN Cleaning",
        brandName: brandName || "GOOD TOUCH",
        gstin: gstin || null,
        phone: phone || "+91-7061101285",
        email: email || "info@aevancleaning.com",
        address: address || "Bihar Sharif, Nalanda, Bihar",
        invoicePrefix: invoicePrefix || "INV-",
        orderPrefix: orderPrefix || "ORD-",
        salePrefix: salePrefix || "SAL-",
        quotationPrefix: quotationPrefix || "QUO-",
        outwardPrefix: outwardPrefix || "OUT-",
        paymentPrefix: paymentPrefix || "PAY-",
        receiptPrefix: receiptPrefix || "REC-",
        supplierPrefix: supplierPrefix || "SUP-",
        poPrefix: poPrefix || "PO-",
      },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(brandName !== undefined && { brandName }),
        ...(gstin !== undefined && { gstin }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(invoicePrefix !== undefined && { invoicePrefix }),
        ...(orderPrefix !== undefined && { orderPrefix }),
        ...(salePrefix !== undefined && { salePrefix }),
        ...(quotationPrefix !== undefined && { quotationPrefix }),
        ...(outwardPrefix !== undefined && { outwardPrefix }),
        ...(paymentPrefix !== undefined && { paymentPrefix }),
        ...(receiptPrefix !== undefined && { receiptPrefix }),
        ...(supplierPrefix !== undefined && { supplierPrefix }),
        ...(poPrefix !== undefined && { poPrefix }),
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "UPDATE_COMPANY_CONFIG",
      entityType: "COMPANY_CONFIG",
      entityId: "default",
      previousState: existing,
      newState: updated,
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
