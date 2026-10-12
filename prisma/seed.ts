import { PrismaClient, Role, CustomerType } from "@prisma/client";
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
  let defaultLoc = await prisma.location.findFirst({
    where: { isDefault: true },
  });

  if (!defaultLoc) {
    console.log("Creating default storage location...");
    defaultLoc = await prisma.location.create({
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

  // 4. Create Admin and Staff Accounts if missing
  const adminEmail = "admin@aevancleaning.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("AevanAdmin@2026", salt),
        name: "Operations Admin",
        phone: "+91-9876543210",
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log("✅ Admin user created.");
  }

  const staffEmail = "staff@aevancleaning.com";
  const existingStaff = await prisma.user.findUnique({ where: { email: staffEmail } });
  if (!existingStaff) {
    const salt = await bcrypt.genSalt(10);
    await prisma.user.create({
      data: {
        email: staffEmail,
        passwordHash: await bcrypt.hash("AevanStaff@2026", salt),
        name: "Field Operations Staff",
        phone: "+91-9876543211",
        role: Role.STAFF,
        isActive: true,
      },
    });
    console.log("✅ Staff user created.");
  }

  // 5. Initialize Expense Categories
  const categories = [
    { name: "Raw Materials", code: "EXP-RAW", description: "Acids, surfactants, fragrances, chemicals" },
    { name: "Packaging", code: "EXP-PKG", description: "Bottles, caps, cartons, labels" },
    { name: "Utilities", code: "EXP-UTIL", description: "Electricity, factory water, fuel" },
    { name: "Freight & Shipping", code: "EXP-FRT", description: "Logistics and courier charges" },
    { name: "Salaries & Wages", code: "EXP-SAL", description: "Factory labor and team payroll" },
    { name: "Maintenance & Repairs", code: "EXP-MAINT", description: "Machinery, equipment servicing" },
    { name: "Office & Administrative", code: "EXP-ADM", description: "Stationery, software subscriptions" },
  ];
  for (const cat of categories) {
    const exists = await prisma.expenseCategory.findUnique({ where: { name: cat.name } });
    if (!exists) {
      await prisma.expenseCategory.create({ data: cat });
    }
  }
  console.log("✅ Expense Categories initialized.");

  // 6. Initialize Sample Products
  const sampleProducts = [
    {
      name: "GOOD TOUCH Heavy Duty Acid Cleaner (5L)",
      sku: "PROD-ACID-5L",
      description: "Concentrated hydrochloric industrial bathroom & surface cleaner",
      unit: "CAN_5L",
      category: "ACID_CLEANER",
      basePrice: 420.0,
      costPrice: 280.0,
      taxRate: 18.0,
    },
    {
      name: "GOOD TOUCH Premium Dish Wash Gel (1L)",
      sku: "PROD-DISH-1L",
      description: "Grease cutting lemon fragrance active dish wash liquid",
      unit: "BOTTLE_1L",
      category: "DISH_WASH",
      basePrice: 160.0,
      costPrice: 95.0,
      taxRate: 18.0,
    },
    {
      name: "GOOD TOUCH Sparkle Tile & Ceramic Cleaner (500ml)",
      sku: "PROD-TILE-500ML",
      description: "Multi-surface stain remover tile cleaner",
      unit: "BOTTLE_500ML",
      category: "TILE_CLEANER",
      basePrice: 110.0,
      costPrice: 65.0,
      taxRate: 18.0,
    },
  ];

  for (const p of sampleProducts) {
    let prod = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!prod) {
      prod = await prisma.product.create({ data: p });
      // Add initial stock balance
      if (defaultLoc) {
        await prisma.stockBalance.create({
          data: {
            productId: prod.id,
            locationId: defaultLoc.id,
            quantity: 150,
          },
        });
      }
    }
  }
  console.log("✅ Sample Products and Initial Stock initialized.");

  // 7. Initialize Sample Customer
  const existingCustomer = await prisma.customer.findFirst();
  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        customerCode: "CUST-0001",
        name: "Patna Central Hotel & Resorts",
        contactPerson: "Mr. Rajesh Kumar",
        phone: "+91-9871234567",
        email: "procurement@patnacentral.com",
        customerType: CustomerType.CORPORATE,
        billingAddress: "Fraser Road, Patna, Bihar - 800001",
        shippingAddress: "Fraser Road, Patna, Bihar - 800001",
        gstin: "10AABCP1234A1Z1",
      },
    });
    console.log("✅ Demo Customer created.");
  }

  // 8. Initialize Sample Supplier
  const existingSupplier = await prisma.supplier.findFirst();
  if (!existingSupplier) {
    await prisma.supplier.create({
      data: {
        supplierCode: "SUP-0001",
        name: "Gujarat Alkalies & Chemicals Ltd",
        businessName: "GACL Industrial Division",
        contactPerson: "Nilesh Patel",
        phone: "+91-9825012345",
        email: "sales@gacl.com",
        billingAddress: "Dahej Industrial Complex, Bharuch, Gujarat",
        gstin: "24AAACG1234F1Z5",
        category: "CHEMICALS",
      },
    });
    console.log("✅ Demo Supplier created.");
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
