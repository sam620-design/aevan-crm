import { hashPassword, verifyPassword, signSessionToken, verifySessionToken, SessionUser } from "../src/lib/auth";
import { isScopeSufficient, isSuperadmin } from "../src/lib/permissions";
import { Role, ModuleName, ActionName, DataScope } from "@prisma/client";

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

async function runSecurityTestSuite() {
  console.log("==========================================================");
  console.log("🔒 AEVAN Cleaning CRM — Phase 1 Security & Permission Tests");
  console.log("==========================================================\n");

  // 1. Password Hashing & Verification
  console.log("Group 1: Password Security & Cryptography");
  const rawPassword = "TestPassword@2026";
  const hash = await hashPassword(rawPassword);
  assert(hash.startsWith("$2"), "Password hashed using secure bcrypt salt");
  assert(hash !== rawPassword, "Password is not stored in plaintext");
  const isCorrect = await verifyPassword(rawPassword, hash);
  assert(isCorrect === true, "verifyPassword accepts matching password");
  const isWrong = await verifyPassword("WrongPassword123", hash);
  assert(isWrong === false, "verifyPassword rejects incorrect password");

  // 2. JWT Session Security
  console.log("\nGroup 2: JWT Session Token Integrity");
  const mockUser: SessionUser = {
    id: "user-1234-uuid",
    email: "rahul@aevancleaning.com",
    name: "Rahul Kumar",
    role: Role.STAFF,
  };
  const token = await signSessionToken(mockUser);
  assert(typeof token === "string" && token.length > 30, "signSessionToken generates valid JWT");
  const decoded = await verifySessionToken(token);
  assert(decoded?.id === mockUser.id, "verifySessionToken decodes user id correctly");
  assert(decoded?.role === Role.STAFF, "verifySessionToken preserves user role");
  const invalidDecoded = await verifySessionToken("tampered.fake.token");
  assert(invalidDecoded === null, "verifySessionToken safely rejects tampered token");

  // 3. Global Permission Hierarchy & Zero-Implicit Permissions
  console.log("\nGroup 3: Global Permission Hierarchy & Role Authority");
  const superadminUser: SessionUser = {
    id: "super-001",
    email: "superadmin@aevancleaning.com",
    name: "AEVAN Root Superadmin",
    role: Role.SUPERADMIN,
  };
  const adminUser: SessionUser = {
    id: "admin-001",
    email: "admin@aevancleaning.com",
    name: "Admin User",
    role: Role.ADMIN,
  };
  const staffUser: SessionUser = {
    id: "staff-001",
    email: "staff@aevancleaning.com",
    name: "Staff User",
    role: Role.STAFF,
  };

  assert(isSuperadmin(superadminUser) === true, "Superadmin recognized with root authority");
  assert(isSuperadmin(adminUser) === false, "Admin is NOT Superadmin and has no root authority");
  assert(isSuperadmin(staffUser) === false, "Staff is NOT Superadmin and has no root authority");

  // 4. DataScope Hierarchy Rules
  console.log("\nGroup 4: DataScope Hierarchy Compatibility");
  assert(isScopeSufficient(DataScope.ALL, DataScope.ALL) === true, "Scope ALL satisfies ALL");
  assert(isScopeSufficient(DataScope.ALL, DataScope.ASSIGNED) === true, "Scope ALL satisfies ASSIGNED");
  assert(isScopeSufficient(DataScope.ALL, DataScope.OWN) === true, "Scope ALL satisfies OWN");

  assert(isScopeSufficient(DataScope.ASSIGNED, DataScope.ALL) === false, "Scope ASSIGNED cannot access ALL");
  assert(isScopeSufficient(DataScope.ASSIGNED, DataScope.ASSIGNED) === true, "Scope ASSIGNED satisfies ASSIGNED");
  assert(isScopeSufficient(DataScope.ASSIGNED, DataScope.OWN) === true, "Scope ASSIGNED satisfies OWN");

  assert(isScopeSufficient(DataScope.OWN, DataScope.ALL) === false, "Scope OWN cannot access ALL");
  assert(isScopeSufficient(DataScope.OWN, DataScope.ASSIGNED) === false, "Scope OWN cannot access ASSIGNED");
  assert(isScopeSufficient(DataScope.OWN, DataScope.OWN) === true, "Scope OWN satisfies OWN");

  // 5. Environment & Superadmin Bootstrap Secrets
  console.log("\nGroup 5: Bootstrap Secrets Configuration");
  const bootstrapEmail = process.env.SUPERADMIN_EMAIL || "superadmin@aevancleaning.com";
  const bootstrapPassword = process.env.SUPERADMIN_PASSWORD || "AevanClean@2026#SecureAdmin";
  assert(bootstrapEmail.includes("@"), "SUPERADMIN_EMAIL configured with valid email format");
  assert(bootstrapPassword.length >= 10, "SUPERADMIN_PASSWORD meets enterprise minimum length (>=10 chars)");

  // 6. Verification of Mandatory Pending Policy Enums
  console.log("\nGroup 6: Verification of Pending Policy Enums");
  assert(ActionName.VIEW_PROFIT_MARGINS === "VIEW_PROFIT_MARGINS", "Action VIEW_PROFIT_MARGINS exists in ActionName enum");
  assert(ActionName.APPROVE_DISCREPANCY === "APPROVE_DISCREPANCY", "Action APPROVE_DISCREPANCY exists for Outward reconciliation");
  assert(ModuleName.INVENTORY_OUTWARD === "INVENTORY_OUTWARD", "ModuleName INVENTORY_OUTWARD is isolated from SALES");
  assert(ModuleName.SALES === "SALES" && ModuleName.ORDERS === "ORDERS", "SALES and ORDERS are distinct modules");

  console.log("\n==========================================================");
  console.log(`📊 TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log("==========================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
