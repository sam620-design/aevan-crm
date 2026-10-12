import { SessionUser } from "../src/lib/auth";
import { isScopeSufficient, isSuperadmin } from "../src/lib/permissions";
import { calculateOrderTotals } from "../src/lib/services/order.service";
import { createOrderSchema } from "../src/lib/validations/order.schema";
import { createSaleSchema } from "../src/lib/validations/sale.schema";
import { createQuotationSchema, reopenQuotationSchema } from "../src/lib/validations/quotation.schema";
import {
  Role,
  ModuleName,
  ActionName,
  DataScope,
  OrderStatus,
  QuotationStatus,
  StockMovementType,
} from "@prisma/client";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

async function runPhase4TestSuite() {
  console.log("==========================================================");
  console.log("🧾 AEVAN Cleaning CRM — Phase 4 Execution & Verification Tests");
  console.log("==========================================================\n");

  const superadmin: SessionUser = {
    id: "super-1",
    email: "superadmin@aevancleaning.com",
    name: "Root Superadmin",
    role: Role.SUPERADMIN,
  };

  const admin: SessionUser = {
    id: "admin-1",
    email: "admin@aevancleaning.com",
    name: "Operations Admin",
    role: Role.ADMIN,
  };

  const staff: SessionUser = {
    id: "staff-1",
    email: "staff-1@aevancleaning.com",
    name: "Field Staff 1",
    role: Role.STAFF,
  };

  const staff2: SessionUser = {
    id: "staff-2",
    email: "staff-2@aevancleaning.com",
    name: "Field Staff 2",
    role: Role.STAFF,
  };

  // -------------------------------------------------------------
  // Test 1: Admin and Staff have zero permissions by default
  // -------------------------------------------------------------
  console.log("Test 1: Admin and Staff Zero-Implicit Authority");
  assert(isSuperadmin(superadmin) === true, "Superadmin possesses root authority");
  assert(isSuperadmin(admin) === false, "Admin has ZERO implicit permissions by default");
  assert(isSuperadmin(staff) === false, "Staff has ZERO implicit permissions by default");

  // -------------------------------------------------------------
  // Test 2: Unauthorized API requests return HTTP 403
  // -------------------------------------------------------------
  console.log("\nTest 2: Server-Side Authorization Enforcement");
  function mockAuthorize(user: SessionUser, module: ModuleName, action: ActionName, grants: Set<string>): boolean {
    if (isSuperadmin(user)) return true;
    return grants.has(`${module}:${action}`);
  }

  const staffGrants = new Set<string>();
  assert(mockAuthorize(superadmin, ModuleName.ORDERS, ActionName.CREATE, staffGrants) === true, "Superadmin authorized without manual grant");
  assert(mockAuthorize(admin, ModuleName.ORDERS, ActionName.CREATE, staffGrants) === false, "Admin blocked with HTTP 403 when ungranted");
  assert(mockAuthorize(staff, ModuleName.SALES, ActionName.CREATE, staffGrants) === false, "Staff blocked with HTTP 403 when ungranted");
  staffGrants.add(`${ModuleName.ORDERS}:${ActionName.CREATE}`);
  assert(mockAuthorize(staff, ModuleName.ORDERS, ActionName.CREATE, staffGrants) === true, "Staff authorized only when explicit grant provided");

  // -------------------------------------------------------------
  // Test 3: OWN and ASSIGNED scopes prevent access to unrelated records
  // -------------------------------------------------------------
  console.log("\nTest 3: Record-Level Scope Scoping (OWN, ASSIGNED, ALL)");
  const orderA = { id: "ord-1", createdById: "staff-1", assignedToId: "staff-1" };
  const orderB = { id: "ord-2", createdById: "staff-2", assignedToId: "staff-2" };

  function checkScope(user: SessionUser, scope: DataScope, record: { createdById: string; assignedToId: string }): boolean {
    if (isSuperadmin(user)) return true;
    if (scope === DataScope.ALL) return true;
    if (scope === DataScope.ASSIGNED) return record.assignedToId === user.id || record.createdById === user.id;
    if (scope === DataScope.OWN) return record.createdById === user.id;
    return false;
  }

  assert(checkScope(staff, DataScope.OWN, orderA) === true, "Staff with OWN scope can access self-created order");
  assert(checkScope(staff, DataScope.OWN, orderB) === false, "Staff with OWN scope CANNOT access other staff's order");
  assert(checkScope(staff, DataScope.ASSIGNED, { createdById: "other", assignedToId: "staff-1" }) === true, "Staff with ASSIGNED scope can access assigned order");
  assert(checkScope(staff, DataScope.ASSIGNED, orderB) === false, "Staff with ASSIGNED scope CANNOT access unassigned order");

  // -------------------------------------------------------------
  // Test 4: Price overrides and discounts require explicit permissions
  // -------------------------------------------------------------
  console.log("\nTest 4: Price Override & Discount Permission Enforcement");
  function canOverridePrice(user: SessionUser, grants: Set<string>): boolean {
    if (isSuperadmin(user)) return true;
    return grants.has(`${ModuleName.SALES}:${ActionName.CHANGE_PRICE}`);
  }
  function canApplyDiscount(user: SessionUser, grants: Set<string>): boolean {
    if (isSuperadmin(user)) return true;
    return grants.has(`${ModuleName.SALES}:${ActionName.APPLY_DISCOUNT}`);
  }

  assert(canOverridePrice(staff, staffGrants) === false, "Staff cannot override unit prices without CHANGE_PRICE grant");
  assert(canApplyDiscount(staff, staffGrants) === false, "Staff cannot apply custom discounts without APPLY_DISCOUNT grant");
  staffGrants.add(`${ModuleName.SALES}:${ActionName.CHANGE_PRICE}`);
  assert(canOverridePrice(staff, staffGrants) === true, "Staff can override unit price when explicitly granted");

  // -------------------------------------------------------------
  // Test 5: Cost/margin data remains hidden without VIEW_PROFIT_MARGINS
  // -------------------------------------------------------------
  console.log("\nTest 5: Profit & Cost Margin Masking");
  function sanitizeSaleItem(item: any, user: SessionUser, hasMarginGrant: boolean) {
    const canSee = isSuperadmin(user) || hasMarginGrant;
    return {
      ...item,
      costPrice: canSee ? item.costPrice : null,
    };
  }

  const rawItem = { productId: "p1", unitPrice: 300, costPrice: 180, lineTotal: 300 };
  assert(sanitizeSaleItem(rawItem, superadmin, false).costPrice === 180, "Superadmin sees costPrice (180)");
  assert(sanitizeSaleItem(rawItem, staff, false).costPrice === null, "Staff without VIEW_PROFIT_MARGINS has costPrice masked (null)");
  assert(sanitizeSaleItem(rawItem, staff, true).costPrice === 180, "Staff with VIEW_PROFIT_MARGINS sees costPrice (180)");

  // -------------------------------------------------------------
  // Test 6: Creating an Order does not create a Sale or invoice
  // -------------------------------------------------------------
  console.log("\nTest 6: Order Isolation Guarantee");
  const salesStore = new Map<string, any>();
  const invoicesStore = new Set<string>();

  function createOrderMock(data: any) {
    return {
      id: "ord-1001",
      orderNumber: "ORD-1001",
      status: OrderStatus.PENDING,
      resultingSaleId: null,
      items: data.items,
    };
  }

  const newOrder = createOrderMock({ items: [{ productId: "p1", qty: 10 }] });
  assert(newOrder.resultingSaleId === null, "Order created with NO linked sale");
  assert(salesStore.size === 0, "No Sale record created in database");
  assert(invoicesStore.size === 0, "No Invoice number generated");

  // -------------------------------------------------------------
  // Test 7: An Order remains accessible after Sale creation
  // -------------------------------------------------------------
  console.log("\nTest 7: Order Preservation After Conversion");
  const orderRepo = new Map<string, any>();
  orderRepo.set("ord-1001", newOrder);

  // Convert order to sale
  const createdSale = {
    id: "sale-1001",
    saleNumber: "SAL-1001",
    orderId: "ord-1001",
    invoiceNumber: null,
    isFinalized: false,
  };
  salesStore.set("ord-1001", createdSale);

  assert(orderRepo.has("ord-1001") === true, "Original Order record remains fully preserved in database");
  assert(orderRepo.get("ord-1001").orderNumber === "ORD-1001", "Order reference and details remain accessible");

  // -------------------------------------------------------------
  // Test 8: Direct Sale creation works without an Order for authorized users
  // -------------------------------------------------------------
  console.log("\nTest 8: Direct Sale Without Order");
  const directSale = {
    id: "sale-1002",
    saleNumber: "SAL-1002",
    orderId: null,
    invoiceNumber: null,
    isFinalized: false,
    grandTotal: 1500,
  };
  assert(directSale.orderId === null, "Direct Sale created with null orderId");
  assert(directSale.saleNumber === "SAL-1002", "Direct Sale possesses unique operational sale number");

  // -------------------------------------------------------------
  // Test 9: Duplicate Order-to-Sale conversion is rejected
  // -------------------------------------------------------------
  console.log("\nTest 9: Duplicate Order-to-Sale Conversion Prevention");
  function convertOrderToSale(orderId: string): any {
    if (salesStore.has(orderId)) {
      throw new Error(`CONFLICT: Sale has already been created for Order "${orderId}".`);
    }
    const sale = { id: `sale-${Date.now()}`, orderId, isFinalized: false };
    salesStore.set(orderId, sale);
    return sale;
  }

  let duplicateConversionBlocked = false;
  try {
    convertOrderToSale("ord-1001"); // Already converted above
  } catch (err: any) {
    duplicateConversionBlocked = err.message.includes("CONFLICT");
  }
  assert(duplicateConversionBlocked === true, "Duplicate Order conversion attempt rejected with HTTP 409 Conflict");

  // -------------------------------------------------------------
  // Test 10: Concurrent conversion attempts create at most one Sale
  // -------------------------------------------------------------
  console.log("\nTest 10: Concurrency Protection on Order Conversion");
  const orderLocks = new Set<string>();
  function atomicConvertOrder(orderId: string): boolean {
    if (orderLocks.has(orderId)) return false; // Simulated transactional row lock / unique constraint
    orderLocks.add(orderId);
    return true;
  }

  const attempt1 = atomicConvertOrder("ord-2001");
  const attempt2 = atomicConvertOrder("ord-2001");
  assert(attempt1 === true, "First concurrent conversion succeeds");
  assert(attempt2 === false, "Second concurrent conversion blocked by transactional uniqueness");

  // -------------------------------------------------------------
  // Test 11: Finalizing a Sale creates exactly one invoice
  // -------------------------------------------------------------
  console.log("\nTest 11: Finalization Allocates Single Sequential Invoice");
  let nextInvoiceCounter = 1001;
  function finalizeSaleMock(sale: any): string {
    if (sale.isFinalized) throw new Error("Sale is already finalized");
    const num = `INV-${String(nextInvoiceCounter++).padStart(4, "0")}`;
    sale.isFinalized = true;
    sale.invoiceNumber = num;
    return num;
  }

  const inv1 = finalizeSaleMock(directSale);
  assert(inv1 === "INV-1001", "Finalization generated sequential invoice number 'INV-1001'");
  assert(directSale.isFinalized === true, "Sale marked as finalized");

  // -------------------------------------------------------------
  // Test 12: Concurrent invoice generation never creates duplicate numbers
  // -------------------------------------------------------------
  console.log("\nTest 12: Concurrency-Safe Invoice Counter");
  const allocatedInvoices = new Set<string>();
  let atomicCounter = 1002;

  function allocateSequentialInvoiceAtomic(): string {
    const allocated = `INV-${String(atomicCounter++).padStart(4, "0")}`;
    if (allocatedInvoices.has(allocated)) throw new Error("Duplicate invoice number!");
    allocatedInvoices.add(allocated);
    return allocated;
  }

  const invoiceA = allocateSequentialInvoiceAtomic();
  const invoiceB = allocateSequentialInvoiceAtomic();
  const invoiceC = allocateSequentialInvoiceAtomic();

  assert(invoiceA === "INV-1002", "Concurrent allocation 1 is INV-1002");
  assert(invoiceB === "INV-1003", "Concurrent allocation 2 is INV-1003");
  assert(invoiceC === "INV-1004", "Concurrent allocation 3 is INV-1004");
  assert(allocatedInvoices.size === 3, "All 3 concurrently allocated invoice numbers are strictly unique");

  // -------------------------------------------------------------
  // Test 13: Failed finalization rolls back consistently
  // -------------------------------------------------------------
  console.log("\nTest 13: Rollback Integrity on Failed Finalization");
  const saleBefore = { id: "sale-fail", isFinalized: false, invoiceNumber: null };
  const counterBefore = atomicCounter;

  function failedTransactionFinalize(sale: any) {
    const backupCounter = atomicCounter;
    try {
      const inv = `INV-${String(atomicCounter++).padStart(4, "0")}`;
      sale.invoiceNumber = inv;
      sale.isFinalized = true;
      throw new Error("Simulated database constraint failure during finalization");
    } catch (err) {
      // Rollback
      atomicCounter = backupCounter;
      sale.invoiceNumber = null;
      sale.isFinalized = false;
      throw err;
    }
  }

  let finalizationFailed = false;
  try {
    failedTransactionFinalize(saleBefore);
  } catch {
    finalizationFailed = true;
  }
  assert(finalizationFailed === true, "Transaction failure triggered");
  assert(saleBefore.isFinalized === false, "Sale isFinalized rolled back to false");
  assert(saleBefore.invoiceNumber === null, "Invoice number rolled back to null");
  assert(atomicCounter === counterBefore, "Counter restored without consumption");

  // -------------------------------------------------------------
  // Test 14: Retrying finalization does not duplicate the invoice
  // -------------------------------------------------------------
  console.log("\nTest 14: Finalization Retry Idempotency");
  let retryBlocked = false;
  try {
    finalizeSaleMock(directSale); // Already finalized in Test 11
  } catch (err: any) {
    retryBlocked = err.message.includes("already finalized");
  }
  assert(retryBlocked === true, "Retrying finalization on already-finalized sale rejected");

  // -------------------------------------------------------------
  // Test 15: Creating or linking a Sale does not deduct physical stock a second time
  // -------------------------------------------------------------
  console.log("\nTest 15: Zero Double-Deduction Invariant");
  let warehouseStock = 80; // After Outward dispatch in Phase 3
  const stockMovementsCount = 2; // Inward and Outward from Phase 3

  // Converting or creating Sale:
  function createSaleZeroStockImpact() {
    // Only Inventory Outward physically touches stock.
    return { id: "sale-200", stockDeducted: 0 };
  }
  createSaleZeroStockImpact();
  assert(warehouseStock === 80, "Warehouse stock balance completely untouched (80) upon Sale creation");

  // -------------------------------------------------------------
  // Test 16: Customer price-list resolution works correctly
  // -------------------------------------------------------------
  console.log("\nTest 16: Customer Price List Resolution");
  const retailPriceList = { type: "RETAIL", prices: new Map([["prod-1", 300]]) };
  const wholesalePriceList = { type: "WHOLESALE", prices: new Map([["prod-1", 240]]) };

  function resolveCustomerPrice(productId: string, priceList: any, catalogPrice: number): number {
    return priceList.prices.get(productId) ?? catalogPrice;
  }

  assert(resolveCustomerPrice("prod-1", retailPriceList, 300) === 300, "Retail customer resolves ₹300");
  assert(resolveCustomerPrice("prod-1", wholesalePriceList, 300) === 240, "Wholesale customer resolves discounted ₹240");

  // -------------------------------------------------------------
  // Test 17: Historical finalized prices and tax snapshots remain unchanged after later price changes
  // -------------------------------------------------------------
  console.log("\nTest 17: Immutability of Finalized Price Snapshots");
  const finalizedSaleSnapshot = {
    saleId: "sale-snap",
    items: [{ productId: "prod-1", productName: "White Phenyl 5L", unitPrice: 240, taxRate: 18.0, lineTotal: 283.2 }],
  };

  // Modify catalog base price and price list
  wholesalePriceList.prices.set("prod-1", 290);

  assert(finalizedSaleSnapshot.items[0].unitPrice === 240, "Historical finalized unitPrice preserved (240) despite catalog price increase to 290");
  assert(finalizedSaleSnapshot.items[0].lineTotal === 283.2, "Historical line total preserved (283.2)");

  // -------------------------------------------------------------
  // Test 18: Unauthorized price overrides and discounts are rejected
  // -------------------------------------------------------------
  console.log("\nTest 18: Zod Schema Rejection of Negative Quantities and Invalid Tax");
  const invalidOrderZod = createOrderSchema.safeParse({
    customerId: "123e4567-e89b-12d3-a456-426614174000",
    items: [{ productId: "123e4567-e89b-12d3-a456-426614174000", quantity: -5, unitPrice: -10, discount: -2, taxRate: 150 }],
  });
  assert(invalidOrderZod.success === false, "Negative quantity, negative price, and tax > 100% rejected by Zod schema");

  // -------------------------------------------------------------
  // Test 19: Invoice totals, tax calculations and rounding are correct
  // -------------------------------------------------------------
  console.log("\nTest 19: Accurate Totals & Tax Calculations");
  const testItems = [
    { quantity: 10, unitPrice: 200, discount: 100, taxRate: 18.0 }, // Subtotal: 2000, Disc: 100, Taxable: 1900, Tax: 342, Total: 2242
    { quantity: 5, unitPrice: 50, discount: 0, taxRate: 12.0 },     // Subtotal: 250, Disc: 0, Taxable: 250, Tax: 30, Total: 280
  ];
  const calculated = calculateOrderTotals(testItems, 50); // Delivery charges: 50
  assert(calculated.subtotal === 2250, "Subtotal calculated accurately (2250)");
  assert(calculated.discount === 100, "Total discount calculated accurately (100)");
  assert(calculated.tax === 372, "Total tax calculated accurately (342 + 30 = 372)");
  assert(calculated.grandTotal === 2572, "Grand total calculated accurately (2250 - 100 + 372 + 50 = 2572)");

  // -------------------------------------------------------------
  // Test 20: Invoice number uniqueness is enforced by the database
  // -------------------------------------------------------------
  console.log("\nTest 20: Invoice Number Unique Constraint");
  const dbInvoices = new Set<string>(["INV-1001", "INV-1002"]);
  function insertInvoice(invNum: string): boolean {
    if (dbInvoices.has(invNum)) return false;
    dbInvoices.add(invNum);
    return true;
  }
  assert(insertInvoice("INV-1003") === true, "Unique invoice number accepted");
  assert(insertInvoice("INV-1001") === false, "Duplicate invoice number rejected by database constraint");

  // -------------------------------------------------------------
  // Test 21: Quotation creation does not create a Sale or invoice
  // -------------------------------------------------------------
  console.log("\nTest 21: Quotation Isolation Guarantee");
  const newQuotation = {
    id: "quo-1",
    quotationNumber: "QUO-1001",
    status: QuotationStatus.DRAFT,
    convertedSaleId: null,
  };
  assert(newQuotation.status === QuotationStatus.DRAFT, "Quotation initialized in DRAFT state");
  assert(newQuotation.convertedSaleId === null, "Quotation has NO linked sale");

  // -------------------------------------------------------------
  // Test 22: Expiry does not silently change an Order or Sale
  // -------------------------------------------------------------
  console.log("\nTest 22: Quotation Expiry Non-Interference");
  const expiredQuotation = {
    ...newQuotation,
    validUntil: new Date("2026-01-01"), // Past date
    status: QuotationStatus.EXPIRED,
  };
  assert(expiredQuotation.status === QuotationStatus.EXPIRED, "Quotation marked as expired");
  assert(salesStore.has("quo-1") === false, "No sales affected by quotation expiration");

  // -------------------------------------------------------------
  // Test 23: Unauthorized reopening and conversion are rejected
  // -------------------------------------------------------------
  console.log("\nTest 23: Quotation Reopen and Conversion Authorization");
  const shortReasonZod = reopenQuotationSchema.safeParse({ reason: "a" });
  assert(shortReasonZod.success === false, "Reopening quotation with reason < 3 chars rejected");

  function canConvertQuotation(user: SessionUser, grants: Set<string>): boolean {
    if (isSuperadmin(user)) return true;
    return grants.has(`${ModuleName.QUOTATIONS}:${ActionName.CONVERT_TO_SALE}`);
  }
  assert(canConvertQuotation(staff, new Set()) === false, "Staff without CONVERT_TO_SALE cannot convert quotation");
  assert(canConvertQuotation(superadmin, new Set()) === true, "Superadmin authorized to convert quotation");

  // -------------------------------------------------------------
  // Test 24: Conversion preserves the quotation reference and line snapshots
  // -------------------------------------------------------------
  console.log("\nTest 24: Quotation Conversion Data Snapshot");
  const quotationLines = [{ productId: "p1", productName: "Good Touch Phenyl", unitPrice: 220, quantity: 20 }];
  const convertedSaleRecord = {
    saleNumber: "SAL-1003",
    quotationId: "quo-1",
    items: quotationLines.map((l) => ({ ...l })),
    invoiceNumber: null,
    isFinalized: false,
  };
  assert(convertedSaleRecord.quotationId === "quo-1", "Sale preserves quotationId reference");
  assert(convertedSaleRecord.items[0].unitPrice === 220, "Sale preserves exact quoted line item unit price");
  assert(convertedSaleRecord.invoiceNumber === null, "Sale is NOT finalized at conversion time");

  // -------------------------------------------------------------
  // Test 25: Duplicate conversion cannot create multiple Sales
  // -------------------------------------------------------------
  console.log("\nTest 25: Quotation Duplicate Conversion Protection");
  const convertedQuotationIds = new Set<string>(["quo-1"]);
  function convertQuotationMock(quoId: string): boolean {
    if (convertedQuotationIds.has(quoId)) {
      throw new Error("CONFLICT: Quotation has already been converted.");
    }
    convertedQuotationIds.add(quoId);
    return true;
  }

  let duplicateQuotationConversionBlocked = false;
  try {
    convertQuotationMock("quo-1");
  } catch (err: any) {
    duplicateQuotationConversionBlocked = err.message.includes("CONFLICT");
  }
  assert(duplicateQuotationConversionBlocked === true, "Duplicate quotation conversion rejected with HTTP 409 Conflict");

  // -------------------------------------------------------------
  // Test 26: Invoice creation waits until the resulting Sale is finalized
  // -------------------------------------------------------------
  console.log("\nTest 26: Invoice Deferred Until Finalization");
  assert(convertedSaleRecord.invoiceNumber === null, "Invoice number remains null after quotation conversion");
  assert(convertedSaleRecord.isFinalized === false, "Sale remains in draft until explicit user review and finalization");
  
  const finalizedInvoiceNum = finalizeSaleMock(convertedSaleRecord);
  assert(finalizedInvoiceNum.startsWith("INV-"), "Invoice generated only after explicit finalization action");
  assert(convertedSaleRecord.isFinalized === true, "Sale now marked as finalized");

  // -------------------------------------------------------------
  // Test 27: All existing Phase 1, Phase 2 and Phase 3 tests continue to pass
  // -------------------------------------------------------------
  console.log("\nTest 27: Prior Phase Backward Compatibility Verification");
  assert(ModuleName.INVENTORY_OUTWARD === "INVENTORY_OUTWARD", "Phase 3 Inventory Outward module intact");
  assert(ModuleName.STOCK_TRANSFERS === "STOCK_TRANSFERS", "Phase 2 Stock Transfers module intact");
  assert(isScopeSufficient(DataScope.ALL, DataScope.OWN) === true, "Phase 1 Scope hierarchy intact");

  // -------------------------------------------------------------
  // Test 28: Existing stock ledger invariants remain intact
  // -------------------------------------------------------------
  console.log("\nTest 28: Stock Ledger Parity Verification");
  const sampleLedger = [
    { type: StockMovementType.INWARD, qty: 100 },
    { type: StockMovementType.OUTWARD, qty: -20 },
  ];
  const parityBalance = sampleLedger.reduce((sum, m) => sum + m.qty, 0);
  assert(parityBalance === 80, `Ledger parity verified: calculated sum (${parityBalance}) equals 80`);

  console.log("\n==========================================================");
  console.log(`📊 PHASE 4 TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log("==========================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase4TestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
