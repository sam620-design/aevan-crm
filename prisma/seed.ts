import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting AEVAN Cleaning CRM database seeding...");

  const superadminEmail = process.env.SUPERADMIN_EMAIL || "superadmin@aevancleaning.com";
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || "AevanClean@2026#SecureAdmin";
  const superadminName = process.env.SUPERADMIN_NAME || "AEVAN Root Superadmin";
  const superadminPhone = process.env.SUPERADMIN_PHONE || "+91-7061101285";

  if (!superadminEmail || !superadminPassword) {
    throw new Error("Missing required SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD in environment.");
  }

  // 1. Check if Superadmin already exists
  const existingSuperadmin = await prisma.user.findFirst({
    where: { role: Role.SUPERADMIN },
  });

  if (!existingSuperadmin) {
    console.log(`Creating initial Superadmin account: ${superadminEmail}`);
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(superadminPassword, salt);

    const superadmin = await prisma.user.create({
      data: {
        email: superadminEmail.toLowerCase().trim(),
        passwordHash,
        name: superadminName,
        phone: superadminPhone,
        role: Role.SUPERADMIN,
        isActive: true,
      },
    });

    console.log(`✅ Superadmin created successfully (ID: ${superadmin.id})`);
  } else {
    console.log(`ℹ️ Superadmin already exists: ${existingSuperadmin.email}`);
  }

  // 2. Initialize default Company Configuration
  const existingConfig = await prisma.companyConfig.findUnique({
    where: { id: "default" },
  });

  if (!existingConfig) {
    console.log("Initializing default CompanyConfig...");
    await prisma.companyConfig.create({
      data: {
        id: "default",
        companyName: "AEVAN Cleaning",
        brandName: "GOOD TOUCH",
        gstin: "10XXXXX0000X1Z5",
        phone: "+91-7061101285",
        email: "info@aevancleaning.com",
        address: "Nalanda District, Bihar Sharif, Bihar - 803111",
        invoicePrefix: "INV-",
        nextInvoiceNumber: 1001,
        orderPrefix: "ORD-",
        nextOrderNumber: 1001,
        outwardPrefix: "OUT-",
        nextOutwardNumber: 1001,
        paymentPrefix: "PAY-",
        nextPaymentNumber: 1001,
        currency: "INR",
        termsAndConditions: "Standard AEVAN Cleaning service & supply terms apply.",
      },
    });
    console.log("✅ CompanyConfig initialized.");
  }

  // 3. Initialize default primary Location
  const existingLocation = await prisma.location.findFirst({
    where: { isDefault: true },
  });

  if (!existingLocation) {
    console.log("Creating default storage location...");
    await prisma.location.create({
      data: {
        name: "Main Facility Warehouse",
        code: "LOC-MAIN-01",
        address: "Industrial Area, Bihar Sharif, Nalanda",
        isDefault: true,
        isActive: true,
      },
    });
    console.log("✅ Default Location created.");
  }

  console.log("🚀 Database bootstrap finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
