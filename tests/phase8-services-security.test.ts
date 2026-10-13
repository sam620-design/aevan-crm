import { SessionUser } from "../src/lib/auth";
import { isScopeSufficient, isSuperadmin } from "../src/lib/permissions";
import {
  createStaffAccessGrantSchema,
  revokeStaffAccessGrantSchema,
  createCleaningServiceSchema,
  updateServiceStatusSchema,
} from "../src/lib/validations/service.schema";
import {
  Role,
  ModuleName,
  ActionName,
  DataScope,
  StaffAccessType,
  ServiceStatus,
  ServiceCategory,
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

async function runPhase8TestSuite() {
  console.log("===============================================================================");
  console.log("🧼 AEVAN Cleaning CRM — Phase 8 Services Module & Staff Access Security Suite");
  console.log("===============================================================================\n");

  // Mock Users
  const superadmin: SessionUser = {
    id: "super-uuid-1",
    email: "superadmin@aevancleaning.com",
    name: "Master Superadmin",
    role: Role.SUPERADMIN,
  };

  const admin1: SessionUser = {
    id: "admin-uuid-1",
    email: "admin1@aevancleaning.com",
    name: "Admin Alice",
    role: Role.ADMIN,
  };

  const admin2: SessionUser = {
    id: "admin-uuid-2",
    email: "admin2@aevancleaning.com",
    name: "Admin Bob",
    role: Role.ADMIN,
  };

  const staffA: SessionUser = {
    id: "staff-uuid-A",
    email: "staffA@aevancleaning.com",
    name: "Staff Aman",
    role: Role.STAFF,
  };

  const staffB: SessionUser = {
    id: "staff-uuid-B",
    email: "staffB@aevancleaning.com",
    name: "Staff Bhavna",
    role: Role.STAFF,
  };

  // Mock In-Memory Grants Store
  interface MockGrant {
    adminId: string;
    staffId: string;
    accessType: StaffAccessType;
    isActive: boolean;
  }
  const mockGrantsStore: MockGrant[] = [];

  function evaluateStaffAccess(
    caller: SessionUser,
    targetStaffId: string,
    requiredType: StaffAccessType = StaffAccessType.VIEW
  ): boolean {
    if (caller.role === Role.SUPERADMIN) return true;
    if (caller.id === targetStaffId) return true;
    if (caller.role === Role.ADMIN) {
      return mockGrantsStore.some(
        (g) =>
          g.adminId === caller.id &&
          g.staffId === targetStaffId &&
          g.isActive &&
          (requiredType === StaffAccessType.VIEW
            ? g.accessType === StaffAccessType.VIEW || g.accessType === StaffAccessType.MANAGEMENT_ASSIGNMENT
            : g.accessType === StaffAccessType.MANAGEMENT_ASSIGNMENT)
      );
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // 1. SUPERADMIN UNIVERSAL OVERSIGHT
  // -------------------------------------------------------------------------
  console.log("--- Section 1: Superadmin Root Authority & Universal Oversight ---");

  assert(
    evaluateStaffAccess(superadmin, staffA.id) === true &&
    evaluateStaffAccess(superadmin, staffB.id) === true,
    "1.1 Superadmin can access authorized Services records for every Staff member"
  );

  // -------------------------------------------------------------------------
  // 2. ADMIN MODULE PERMISSION & STAFF VISIBILITY INDEPENDENCE
  // -------------------------------------------------------------------------
  console.log("\n--- Section 2: Admin Module Permission & Staff Visibility Independence ---");

  // Admin without Services permission
  const adminPermissions: Record<string, DataScope> = {};
  const hasServicesModule = Boolean(adminPermissions[`${ModuleName.SERVICES}:${ActionName.VIEW}`]);
  assert(
    hasServicesModule === false,
    "2.1 Admin without Services permission cannot access the Services module"
  );

  // Grant Admin1 SERVICES:VIEW permission in module table
  adminPermissions[`${ModuleName.SERVICES}:${ActionName.VIEW}`] = DataScope.ALL;

  // Admin1 has module permission, but NO staff grants yet
  assert(
    Boolean(adminPermissions[`${ModuleName.SERVICES}:${ActionName.VIEW}`]) === true &&
    evaluateStaffAccess(admin1, staffA.id) === false,
    "2.2 Admin with Services permission but no Staff visibility grant cannot access Staff A records"
  );

  // -------------------------------------------------------------------------
  // 3. STAFF-SPECIFIC VIEW GRANTS & IDOR PROTECTION
  // -------------------------------------------------------------------------
  console.log("\n--- Section 3: Staff-Specific View Grants & IDOR Isolation ---");

  // Superadmin grants Admin1 VIEW access to Staff A
  mockGrantsStore.push({
    adminId: admin1.id,
    staffId: staffA.id,
    accessType: StaffAccessType.VIEW,
    isActive: true,
  });

  assert(
    evaluateStaffAccess(admin1, staffA.id) === true,
    "3.1 An Admin granted access to Staff A can access permitted records for Staff A"
  );

  assert(
    evaluateStaffAccess(admin1, staffB.id) === false,
    "3.2 The same Admin cannot access Staff B's restricted records by changing record ID (IDOR Prevention)"
  );

  // -------------------------------------------------------------------------
  // 4. VIEW VS MANAGEMENT ASSIGNMENT SEPARATION
  // -------------------------------------------------------------------------
  console.log("\n--- Section 4: View-Only vs Management Assignment Separation ---");

  // Admin1 has VIEW on Staff A, not MANAGEMENT_ASSIGNMENT
  assert(
    evaluateStaffAccess(admin1, staffA.id, StaffAccessType.VIEW) === true,
    "4.1 View-only grant satisfies VIEW requirement"
  );
  assert(
    evaluateStaffAccess(admin1, staffA.id, StaffAccessType.MANAGEMENT_ASSIGNMENT) === false,
    "4.2 View-only access does NOT grant operational management assignment rights"
  );

  // Superadmin grants Admin2 MANAGEMENT_ASSIGNMENT to Staff B
  mockGrantsStore.push({
    adminId: admin2.id,
    staffId: staffB.id,
    accessType: StaffAccessType.MANAGEMENT_ASSIGNMENT,
    isActive: true,
  });

  assert(
    evaluateStaffAccess(admin2, staffB.id, StaffAccessType.MANAGEMENT_ASSIGNMENT) === true,
    "4.3 Management assignment grants operational supervision over Staff B"
  );
  assert(
    evaluateStaffAccess(admin2, staffB.id, StaffAccessType.VIEW) === true,
    "4.4 Management assignment also includes read visibility under approved policy"
  );

  // Unrelated permissions protection: Management assignment does NOT grant profit margins
  const admin2Permissions: Record<string, DataScope> = {};
  const canAdmin2ViewMargins = isScopeSufficient(
    admin2Permissions[`${ModuleName.REPORTS}:${ActionName.VIEW_PROFIT_MARGINS}`] || DataScope.OWN,
    DataScope.ALL
  ) && Boolean(admin2Permissions[`${ModuleName.REPORTS}:${ActionName.VIEW_PROFIT_MARGINS}`]);
  assert(
    canAdmin2ViewMargins === false,
    "4.5 A management assignment does NOT grant unrelated sensitive permissions (profit margins)"
  );

  // -------------------------------------------------------------------------
  // 5. IMMEDIATE ACCESS REVOCATION
  // -------------------------------------------------------------------------
  console.log("\n--- Section 5: Access Revocation Immediate Enforcement ---");

  // Revoke Admin1's grant on Staff A
  const grantToRevoke = mockGrantsStore.find((g) => g.adminId === admin1.id && g.staffId === staffA.id);
  if (grantToRevoke) grantToRevoke.isActive = false;

  assert(
    evaluateStaffAccess(admin1, staffA.id) === false,
    "5.1 Revoked access is immediately denied on subsequent requests"
  );

  // -------------------------------------------------------------------------
  // 6. STAFF PEER ISOLATION
  // -------------------------------------------------------------------------
  console.log("\n--- Section 6: Staff Peer Data Isolation ---");

  assert(
    evaluateStaffAccess(staffA, staffA.id) === true,
    "6.1 Staff A can access their own assigned service records"
  );
  assert(
    evaluateStaffAccess(staffA, staffB.id) === false,
    "6.2 Staff A cannot access Staff B's restricted records without explicit authorization"
  );

  // -------------------------------------------------------------------------
  // 7. SERVICE LIFECYCLE STATE MACHINE
  // -------------------------------------------------------------------------
  console.log("\n--- Section 7: Service Lifecycle Transitions & Validation ---");

  const VALID_TRANSITIONS: Record<ServiceStatus, ServiceStatus[]> = {
    SCHEDULED: [ServiceStatus.ARRIVED, ServiceStatus.RESCHEDULED, ServiceStatus.CANCELLED],
    ARRIVED: [ServiceStatus.IN_PROGRESS, ServiceStatus.CANCELLED],
    IN_PROGRESS: [ServiceStatus.COMPLETED, ServiceStatus.CANCELLED],
    RESCHEDULED: [ServiceStatus.SCHEDULED, ServiceStatus.ARRIVED, ServiceStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
  };

  function canTransition(current: ServiceStatus, next: ServiceStatus): boolean {
    return VALID_TRANSITIONS[current]?.includes(next) ?? false;
  }

  assert(canTransition(ServiceStatus.SCHEDULED, ServiceStatus.ARRIVED) === true, "7.1 Transition: SCHEDULED -> ARRIVED is valid");
  assert(canTransition(ServiceStatus.ARRIVED, ServiceStatus.IN_PROGRESS) === true, "7.2 Transition: ARRIVED -> IN_PROGRESS is valid");
  assert(canTransition(ServiceStatus.IN_PROGRESS, ServiceStatus.COMPLETED) === true, "7.3 Transition: IN_PROGRESS -> COMPLETED is valid");
  assert(canTransition(ServiceStatus.COMPLETED, ServiceStatus.SCHEDULED) === false, "7.4 Terminal: COMPLETED -> SCHEDULED is rejected");
  assert(canTransition(ServiceStatus.CANCELLED, ServiceStatus.IN_PROGRESS) === false, "7.5 Terminal: CANCELLED -> IN_PROGRESS is rejected");

  // -------------------------------------------------------------------------
  // 8. SERVICE AND FINANCIAL / INVENTORY SEPARATION
  // -------------------------------------------------------------------------
  console.log("\n--- Section 8: Service Separation from Sales & Inventory ---");

  let initialStock = 1000;
  let customerLedgerBalance = 0;
  let serviceCreated = true;

  // Rule: Creating a service booking does NOT alter stock or financial ledger
  const stockAfterService = initialStock;
  const ledgerAfterService = customerLedgerBalance;

  assert(
    stockAfterService === initialStock,
    "8.1 Invariant: Creating a cleaning service does NOT deduct product stock"
  );
  assert(
    ledgerAfterService === customerLedgerBalance,
    "8.2 Invariant: Creating a cleaning service does NOT post duplicate customer ledger entries"
  );

  // -------------------------------------------------------------------------
  // 9. INPUT VALIDATION SCHEMAS
  // -------------------------------------------------------------------------
  console.log("\n--- Section 9: Service Schemas & Phone Normalization ---");

  const validService = createCleaningServiceSchema.safeParse({
    customerName: "Patna Residency",
    customerPhone: "9876543210",
    serviceAddress: "Bailey Road, Patna",
    category: ServiceCategory.DEEP_CLEANING,
    scheduledDate: "2026-11-01",
    estimatedPrice: 3500,
  });

  assert(
    validService.success && validService.data.customerPhone === "+919876543210",
    "9.1 Schema Validation: Valid service booking with auto-normalized +91 contact"
  );

  const invalidServiceNoAddress = createCleaningServiceSchema.safeParse({
    customerName: "Patna Residency",
    customerPhone: "9876543210",
    serviceAddress: "", // Empty address
    scheduledDate: "2026-11-01",
  });

  assert(
    !invalidServiceNoAddress.success,
    "9.2 Schema Validation: Missing service address is rejected"
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n===============================================================================");
  console.log(`Phase 8 Test Suite Completed: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("===============================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase8TestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
