import { prisma } from "@/lib/prisma";
import { SessionUser } from "@/lib/auth";
import { hasPermission, isSuperadmin, checkEntityAccess } from "@/lib/permissions";
import {
  ModuleName,
  ActionName,
  DataScope,
  Prisma,
  PaymentStatus,
  AllocationType,
  AdvanceMovementType,
  LedgerEntryType,
  SalePaymentStatus,
} from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import {
  CreatePaymentInput,
  ApplyCustomerAdvanceInput,
  ReversePaymentInput,
} from "@/lib/validations/payment.schema";

/**
 * Monetary rounding helper: prevents JavaScript IEEE-754 floating-point inaccuracies
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * 1. Fetch Payments with Scopes & Search
 */
export async function getPayments(
  user: SessionUser,
  params: {
    search?: string;
    customerId?: string;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.VIEW)) ||
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.RECORD_PAYMENT)) ||
    isSuperadmin(user);

  if (!canView) {
    throw new Error("FORBIDDEN: You do not have permission to view payments.");
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.PaymentWhereInput = {};

  if (!isSuperadmin(user)) {
    const perm = await prisma.permission.findFirst({
      where: {
        userId: user.id,
        module: ModuleName.PAYMENTS,
        action: { in: [ActionName.VIEW, ActionName.RECORD_PAYMENT] },
      },
    });

    const scope = perm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN) {
      where.createdById = user.id;
    }
  }

  if (params.customerId) where.customerId = params.customerId;
  if (params.status) where.status = params.status;

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    where.OR = [
      { receiptNumber: { contains: term, mode: "insensitive" } },
      { referenceNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { receivedAt: "desc" },
      include: {
        customer: { select: { id: true, customerCode: true, name: true, phone: true } },
        allocations: {
          include: {
            sale: { select: { id: true, invoiceNumber: true, saleNumber: true, grandTotal: true, balanceAmount: true } },
          },
        },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * 2. Get Single Payment by ID
 */
export async function getPaymentById(user: SessionUser, id: string) {
  const canView =
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.VIEW)) ||
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.RECORD_PAYMENT)) ||
    isSuperadmin(user);

  if (!canView) throw new Error("FORBIDDEN: You do not have permission to view payments.");

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      customer: true,
      allocations: {
        include: {
          sale: true,
        },
      },
      advanceMovements: true,
      createdBy: { select: { id: true, name: true, role: true } },
      reversedBy: { select: { id: true, name: true, role: true } },
    },
  });

  if (!payment) throw new Error("Payment record not found.");

  if (!isSuperadmin(user)) {
    const perm = await prisma.permission.findFirst({
      where: {
        userId: user.id,
        module: ModuleName.PAYMENTS,
        action: { in: [ActionName.VIEW, ActionName.RECORD_PAYMENT] },
      },
    });
    const scope = perm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN && payment.createdById !== user.id) {
      throw new Error("FORBIDDEN: You can only view payments you created.");
    }
  }

  return payment;
}

/**
 * 3. Record / Post Payment
 * Supports:
 * - Direct unallocated receipt
 * - Manual invoice allocations
 * - Oldest-first auto-allocation
 * - Excess payment policy (Block vs Store as Advance)
 * - Atomic sequential receipt numbering
 * - Idempotency protection
 */
export async function createPayment(user: SessionUser, data: CreatePaymentInput) {
  const canCreate =
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.CREATE)) ||
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.RECORD_PAYMENT)) ||
    isSuperadmin(user);

  if (!canCreate) {
    throw new Error("FORBIDDEN: You do not have permission to record payments.");
  }

  // Idempotency check if key provided
  if (data.idempotencyKey) {
    const existingPayment = await prisma.payment.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
      include: { customer: true, allocations: true },
    });
    if (existingPayment) {
      return existingPayment;
    }
  }

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customer || !customer.isActive) {
    throw new Error("Customer not found or is currently inactive.");
  }

  const paymentAmount = round2(data.amount);
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // Permission check for Oldest-First mode
  const isOldestFirst = data.allocationMode === "OLDEST_FIRST";
  if (isOldestFirst) {
    const canAuto =
      (await hasPermission(user, ModuleName.PAYMENTS, ActionName.AUTO_ALLOCATE_OLDEST_FIRST)) ||
      isSuperadmin(user);
    if (!canAuto) {
      throw new Error(
        "FORBIDDEN: You do not have permission to perform oldest-first payment auto-allocation."
      );
    }
  }

  // Check excess advance permission
  const canAcceptAdvance =
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.ACCEPT_CUSTOMER_ADVANCE)) ||
    isSuperadmin(user);

  // Check allocation permission if allocations are requested
  const hasAllocationsRequested =
    isOldestFirst || (data.allocationMode === "MANUAL" && (data.allocations?.length || 0) > 0);

  if (hasAllocationsRequested) {
    const canAllocate =
      (await hasPermission(user, ModuleName.PAYMENTS, ActionName.ALLOCATE)) ||
      (await hasPermission(user, ModuleName.PAYMENTS, ActionName.ALLOCATE_PAYMENT)) ||
      isSuperadmin(user);
    if (!canAllocate) {
      throw new Error("FORBIDDEN: You do not have permission to allocate payments to invoices.");
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Determine invoice allocations
    let resolvedAllocations: Array<{ saleId: string; amount: number; sale: any }> = [];

    if (isOldestFirst) {
      // Find eligible finalized unpaid/partial invoices for this customer, sorted by saleDate asc, id asc
      const eligibleSales = await tx.sale.findMany({
        where: {
          customerId: data.customerId,
          isFinalized: true,
          balanceAmount: { gt: 0 },
        },
        orderBy: [{ saleDate: "asc" }, { id: "asc" }],
      });

      let availableFunds = paymentAmount;
      for (const sale of eligibleSales) {
        if (availableFunds <= 0) break;
        const bal = round2(Number(sale.balanceAmount));
        if (bal <= 0) continue;

        const allocAmt = round2(Math.min(availableFunds, bal));
        resolvedAllocations.push({
          saleId: sale.id,
          amount: allocAmt,
          sale,
        });
        availableFunds = round2(availableFunds - allocAmt);
      }
    } else if (data.allocationMode === "MANUAL" && data.allocations && data.allocations.length > 0) {
      // Manual allocations validation
      const saleIds = data.allocations.map((a) => a.saleId);
      const targetSales = await tx.sale.findMany({
        where: { id: { in: saleIds } },
      });
      const saleMap = new Map(targetSales.map((s) => [s.id, s]));

      let totalManualAllocated = 0;
      for (const alloc of data.allocations) {
        const sale = saleMap.get(alloc.saleId);
        if (!sale) {
          throw new Error(`Invoice record not found: ${alloc.saleId}`);
        }
        if (sale.customerId !== data.customerId) {
          throw new Error(
            `Cross-customer allocation violation: Invoice ${sale.invoiceNumber || sale.saleNumber} does not belong to customer ${customer.name}.`
          );
        }
        if (!sale.isFinalized) {
          throw new Error(
            `Invalid allocation: Invoice ${sale.saleNumber} is not finalized. Payments can only be applied to finalized invoices.`
          );
        }

        const allocAmt = round2(alloc.amount);
        if (allocAmt <= 0) {
          throw new Error("Allocated amount must be strictly positive.");
        }

        const bal = round2(Number(sale.balanceAmount));
        if (allocAmt > bal) {
          throw new Error(
            `Over-allocation error: Amount ₹${allocAmt} exceeds remaining outstanding balance ₹${bal} for invoice ${sale.invoiceNumber || sale.saleNumber}.`
          );
        }

        totalManualAllocated = round2(totalManualAllocated + allocAmt);
        resolvedAllocations.push({
          saleId: sale.id,
          amount: allocAmt,
          sale,
        });
      }

      if (totalManualAllocated > paymentAmount) {
        throw new Error(
          `Over-allocation error: Total invoice allocations (₹${totalManualAllocated}) exceed total payment amount (₹${paymentAmount}).`
        );
      }
    }

    // 2. Reconcile total allocations vs payment amount
    const totalAllocatedAmount = round2(
      resolvedAllocations.reduce((sum, item) => sum + item.amount, 0)
    );
    const unallocatedAdvance = round2(paymentAmount - totalAllocatedAmount);

    // Excess Payment Policy enforcement
    if (unallocatedAdvance > 0) {
      // If customer requested to settle specific invoices but funds exceed allocations
      if (!data.acceptAdvance && data.allocationMode === "MANUAL" && (data.allocations?.length || 0) > 0) {
        // Policy A: Block Excess
        if (!canAcceptAdvance) {
          throw new Error(
            `Excess payment policy violation: Allocation total (₹${totalAllocatedAmount}) is less than payment amount (₹${paymentAmount}), leaving ₹${unallocatedAdvance} unallocated. You do not have permission to store customer advance balance.`
          );
        }
      }

      if (!canAcceptAdvance) {
        throw new Error(
          `FORBIDDEN: You do not have permission to accept customer advance balances (Unallocated amount: ₹${unallocatedAdvance}).`
        );
      }
    }

    // 3. Concurrency-Safe Receipt Number Generation
    let companyConfig = await tx.companyConfig.findUnique({ where: { id: "default" } });
    if (!companyConfig) {
      companyConfig = await tx.companyConfig.create({ data: { id: "default" } });
    }

    const updatedConfig = await tx.companyConfig.update({
      where: { id: "default" },
      data: { nextReceiptNumber: { increment: 1 } },
    });
    const receiptSeq = updatedConfig.nextReceiptNumber - 1;
    const receiptPrefix = updatedConfig.receiptPrefix || "REC-";
    const receiptNumber = `${receiptPrefix}${String(receiptSeq).padStart(4, "0")}`;

    // 4. Create Payment Record
    const payment = await tx.payment.create({
      data: {
        receiptNumber,
        paymentReference: receiptNumber,
        customerId: data.customerId,
        amount: paymentAmount,
        unallocatedAmount: unallocatedAdvance,
        currency: updatedConfig.currency || "INR",
        paymentMethod: data.paymentMethod,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
        referenceNumber: data.referenceNumber || null,
        notes: data.notes || null,
        status: PaymentStatus.POSTED,
        idempotencyKey: data.idempotencyKey || null,
        createdById: user.id,
      },
    });

    // 5. Create Payment Allocations and Update Invoices
    for (const alloc of resolvedAllocations) {
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          saleId: alloc.saleId,
          customerId: data.customerId,
          allocatedAmount: alloc.amount,
          allocationType: isOldestFirst ? AllocationType.OLDEST_FIRST : AllocationType.MANUAL,
          createdById: user.id,
        },
      });

      const updatedPaid = round2(Number(alloc.sale.paidAmount) + alloc.amount);
      const updatedBalance = round2(Number(alloc.sale.balanceAmount) - alloc.amount);
      const newStatus =
        updatedBalance <= 0
          ? SalePaymentStatus.PAID
          : SalePaymentStatus.PARTIAL;

      await tx.sale.update({
        where: { id: alloc.saleId },
        data: {
          paidAmount: updatedPaid,
          balanceAmount: updatedBalance,
          paymentStatus: newStatus,
        },
      });
    }

    // 6. Record Customer Advance Movement if any excess
    if (unallocatedAdvance > 0) {
      const currentAdvance = round2(Number(customer.advanceBalance || 0));
      const updatedAdvance = round2(currentAdvance + unallocatedAdvance);

      await tx.customer.update({
        where: { id: data.customerId },
        data: { advanceBalance: updatedAdvance },
      });

      await tx.customerAdvanceMovement.create({
        data: {
          customerId: data.customerId,
          movementType: AdvanceMovementType.PAYMENT_UNALLOCATED,
          amount: unallocatedAdvance,
          balanceAfter: updatedAdvance,
          paymentId: payment.id,
          referenceNumber: receiptNumber,
          notes: `Unallocated payment advance credit from ${receiptNumber}`,
          createdById: user.id,
        },
      });
    }

    // 7. Append-Only Customer Ledger Entry
    // Convention: Debit = Invoice (Customer owes), Credit = Payment (Customer pays/deposits)
    // Running Balance = Debits - Credits
    const lastLedger = await tx.customerLedger.findFirst({
      where: { customerId: data.customerId },
      orderBy: { createdAt: "desc" },
    });
    const previousBalance = lastLedger ? round2(Number(lastLedger.balance)) : 0;
    const newLedgerBalance = round2(previousBalance - paymentAmount);

    await tx.customerLedger.create({
      data: {
        customerId: data.customerId,
        entryType: LedgerEntryType.PAYMENT_RECEIPT,
        referenceId: payment.id,
        referenceNumber: receiptNumber,
        debit: 0,
        credit: paymentAmount,
        balance: newLedgerBalance,
        description: `Payment received via ${data.paymentMethod}${data.referenceNumber ? ` (Ref: ${data.referenceNumber})` : ""}`,
        createdById: user.id,
      },
    });

    // 8. Immutable Audit Trail
    await logAuditEvent({
      userId: user.id,
      action: "RECORD_PAYMENT",
      entityType: "PAYMENT",
      entityId: payment.id,
      newState: {
        receiptNumber,
        amount: paymentAmount,
        allocatedAmount: totalAllocatedAmount,
        unallocatedAdvance,
        allocationsCount: resolvedAllocations.length,
      },
    });

    return {
      ...payment,
      allocations: resolvedAllocations,
    };
  });
}

/**
 * 4. Apply Existing Customer Advance Balance to Invoices
 */
export async function applyCustomerAdvance(user: SessionUser, data: ApplyCustomerAdvanceInput) {
  const canApply =
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.APPLY_ADVANCE)) ||
    isSuperadmin(user);

  if (!canApply) {
    throw new Error("FORBIDDEN: You do not have permission to apply customer advance balances.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });
  if (!customer) throw new Error("Customer not found.");

  const currentAdvance = round2(Number(customer.advanceBalance || 0));
  if (currentAdvance <= 0) {
    throw new Error("Customer does not have any available advance credit balance.");
  }

  const totalRequested = round2(
    data.allocations.reduce((sum, a) => sum + round2(a.amount), 0)
  );

  if (totalRequested > currentAdvance) {
    throw new Error(
      `Insufficient advance balance: Requested ₹${totalRequested} exceeds available credit balance ₹${currentAdvance}.`
    );
  }

  return prisma.$transaction(async (tx) => {
    // Validate sales
    const saleIds = data.allocations.map((a) => a.saleId);
    const targetSales = await tx.sale.findMany({
      where: { id: { in: saleIds } },
    });
    const saleMap = new Map(targetSales.map((s) => [s.id, s]));

    let remainingAdvance = currentAdvance;

    for (const alloc of data.allocations) {
      const sale = saleMap.get(alloc.saleId);
      if (!sale) throw new Error(`Invoice not found: ${alloc.saleId}`);
      if (sale.customerId !== data.customerId) {
        throw new Error("Cross-customer advance application violation.");
      }
      if (!sale.isFinalized) {
        throw new Error(`Invoice ${sale.saleNumber} is not finalized.`);
      }

      const allocAmt = round2(alloc.amount);
      const bal = round2(Number(sale.balanceAmount));
      if (allocAmt > bal) {
        throw new Error(
          `Allocated amount ₹${allocAmt} exceeds invoice outstanding balance ₹${bal}.`
        );
      }

      // Create allocation record
      const allocation = await tx.paymentAllocation.create({
        data: {
          paymentId: null, // Applied directly from existing advance credit
          saleId: sale.id,
          customerId: data.customerId,
          allocatedAmount: allocAmt,
          allocationType: AllocationType.ADVANCE_APPLIED,
          createdById: user.id,
        },
      });

      // Update invoice
      const updatedPaid = round2(Number(sale.paidAmount) + allocAmt);
      const updatedBalance = round2(bal - allocAmt);
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paidAmount: updatedPaid,
          balanceAmount: updatedBalance,
          paymentStatus:
            updatedBalance <= 0 ? SalePaymentStatus.PAID : SalePaymentStatus.PARTIAL,
        },
      });

      remainingAdvance = round2(remainingAdvance - allocAmt);

      // Record Advance Movement
      await tx.customerAdvanceMovement.create({
        data: {
          customerId: data.customerId,
          movementType: AdvanceMovementType.ADVANCE_APPLIED,
          amount: -allocAmt,
          balanceAfter: remainingAdvance,
          allocationId: allocation.id,
          saleId: sale.id,
          referenceNumber: sale.invoiceNumber || sale.saleNumber,
          notes: `Advance applied against invoice ${sale.invoiceNumber || sale.saleNumber}`,
          createdById: user.id,
        },
      });
    }

    // Update customer advance balance
    await tx.customer.update({
      where: { id: data.customerId },
      data: { advanceBalance: remainingAdvance },
    });

    await logAuditEvent({
      userId: user.id,
      action: "APPLY_CUSTOMER_ADVANCE",
      entityType: "CUSTOMER",
      entityId: data.customerId,
      newState: {
        appliedAmount: totalRequested,
        remainingAdvance,
      },
    });

    return {
      customerId: data.customerId,
      appliedAmount: totalRequested,
      remainingAdvance,
    };
  });
}

/**
 * 5. Reversal of Posted Payment
 * Strict requirements:
 * - Requires PAYMENTS:REVERSE or PAYMENTS:REVERSE_PAYMENT
 * - Mandatory written explanation
 * - Idempotent (cannot reverse twice)
 * - Restores invoice outstanding balances
 * - Restores/reverts customer advance movements
 * - Appends compensating ledger entry
 */
export async function reversePayment(
  user: SessionUser,
  paymentId: string,
  input: ReversePaymentInput
) {
  const canReverse =
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.REVERSE)) ||
    (await hasPermission(user, ModuleName.PAYMENTS, ActionName.REVERSE_PAYMENT)) ||
    isSuperadmin(user);

  if (!canReverse) {
    throw new Error("FORBIDDEN: You do not have permission to reverse payments.");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      allocations: { include: { sale: true } },
      customer: true,
    },
  });

  if (!payment) throw new Error("Payment record not found.");
  if (payment.status === PaymentStatus.REVERSED) {
    throw new Error("Payment has already been reversed.");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Revert all allocations linked to this payment
    for (const alloc of payment.allocations) {
      if (alloc.isReversed) continue;

      const allocAmt = round2(Number(alloc.allocatedAmount));
      const sale = alloc.sale;

      const updatedPaid = Math.max(0, round2(Number(sale.paidAmount) - allocAmt));
      const updatedBalance = round2(Number(sale.balanceAmount) + allocAmt);
      const newStatus =
        updatedPaid === 0
          ? SalePaymentStatus.UNPAID
          : SalePaymentStatus.PARTIAL;

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paidAmount: updatedPaid,
          balanceAmount: updatedBalance,
          paymentStatus: newStatus,
        },
      });

      await tx.paymentAllocation.update({
        where: { id: alloc.id },
        data: {
          isReversed: true,
          reversedAt: new Date(),
          reversedById: user.id,
          reversalReason: input.reason,
        },
      });
    }

    // 2. Revert unallocated customer advance if credited
    const unallocated = round2(Number(payment.unallocatedAmount));
    if (unallocated > 0) {
      const currentAdvance = round2(Number(payment.customer.advanceBalance || 0));
      const updatedAdvance = Math.max(0, round2(currentAdvance - unallocated));

      await tx.customer.update({
        where: { id: payment.customerId },
        data: { advanceBalance: updatedAdvance },
      });

      await tx.customerAdvanceMovement.create({
        data: {
          customerId: payment.customerId,
          movementType: AdvanceMovementType.PAYMENT_REVERSED,
          amount: -unallocated,
          balanceAfter: updatedAdvance,
          paymentId: payment.id,
          referenceNumber: payment.receiptNumber,
          notes: `Advance deduction due to reversal of ${payment.receiptNumber}: ${input.reason}`,
          createdById: user.id,
        },
      });
    }

    // 3. Update Payment record status
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REVERSED,
        reversedAt: new Date(),
        reversedById: user.id,
        reversalReason: input.reason,
        reversedAmount: payment.amount,
      },
    });

    // 4. Append Compensating Customer Ledger Entry
    // Reversal of payment restores the debt: Debit = amount, Credit = 0
    const lastLedger = await tx.customerLedger.findFirst({
      where: { customerId: payment.customerId },
      orderBy: { createdAt: "desc" },
    });
    const prevBalance = lastLedger ? round2(Number(lastLedger.balance)) : 0;
    const newLedgerBalance = round2(prevBalance + Number(payment.amount));

    await tx.customerLedger.create({
      data: {
        customerId: payment.customerId,
        entryType: LedgerEntryType.PAYMENT_REVERSAL,
        referenceId: payment.id,
        referenceNumber: payment.receiptNumber,
        debit: payment.amount,
        credit: 0,
        balance: newLedgerBalance,
        description: `REVERSAL of Payment ${payment.receiptNumber}: ${input.reason}`,
        createdById: user.id,
      },
    });

    // 5. Audit Log
    await logAuditEvent({
      userId: user.id,
      action: "REVERSE_PAYMENT",
      entityType: "PAYMENT",
      entityId: payment.id,
      previousState: { status: payment.status },
      newState: { status: PaymentStatus.REVERSED, reason: input.reason },
    });

    return updatedPayment;
  });
}

/**
 * 6. Customer Financial Ledger Statement
 * Running Balance Convention:
 * - Debit = Invoices issued (Customer debt)
 * - Credit = Payments received / advance credits
 * - Balance = Σ(Debits) - Σ(Credits)
 * - Positive = Customer owes money
 * - Negative = Customer has net credit / advance
 */
export async function getCustomerLedger(
  user: SessionUser,
  customerId: string,
  filters: { startDate?: string; endDate?: string } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.CUSTOMER_LEDGER, ActionName.VIEW)) ||
    isSuperadmin(user);

  if (!canView) {
    throw new Error("FORBIDDEN: You do not have permission to view the customer ledger.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new Error("Customer not found.");

  // Enforce customer-level data scope (OWN, ASSIGNED, ALL)
  const hasAccess = await checkEntityAccess(user, ModuleName.CUSTOMERS, ActionName.VIEW, customer);
  if (!hasAccess) {
    throw new Error("FORBIDDEN: You do not have permission to access records for this customer.");
  }

  const where: Prisma.CustomerLedgerWhereInput = {
    customerId,
  };

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  const entries = await prisma.customerLedger.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  const totalDebits = round2(entries.reduce((sum, e) => sum + Number(e.debit), 0));
  const totalCredits = round2(entries.reduce((sum, e) => sum + Number(e.credit), 0));
  const closingBalance = entries.length > 0 ? Number(entries[entries.length - 1].balance) : 0;

  return {
    customer: {
      id: customer.id,
      customerCode: customer.customerCode,
      name: customer.name,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      billingAddress: customer.billingAddress,
      advanceBalance: Number(customer.advanceBalance),
    },
    summary: {
      totalDebits,
      totalCredits,
      closingBalance,
      currentAdvanceBalance: Number(customer.advanceBalance),
    },
    entries,
  };
}

/**
 * 7. Accounts Receivable & Aging Report
 * Computes:
 * - Total outstanding receivables
 * - Total customer advance balances
 * - Aging buckets:
 *   - Current (Not yet due)
 *   - 1-30 days overdue
 *   - 31-60 days overdue
 *   - 61-90 days overdue
 *   - 90+ days overdue
 * - Cost and profit margins remain strictly masked unless VIEW_PROFIT_MARGINS is held.
 */
export async function getReceivablesReport(
  user: SessionUser,
  params: { customerId?: string; asOfDate?: string } = {}
) {
  const canView =
    (await hasPermission(user, ModuleName.RECEIVABLES, ActionName.VIEW)) ||
    (await hasPermission(user, ModuleName.REPORTS, ActionName.VIEW_REPORTS)) ||
    isSuperadmin(user);

  if (!canView) {
    throw new Error("FORBIDDEN: You do not have permission to view receivables reports.");
  }

  const asOf = params.asOfDate ? new Date(params.asOfDate) : new Date();

  // Query only finalized sales with remaining balance > 0
  const where: Prisma.SaleWhereInput = {
    isFinalized: true,
    balanceAmount: { gt: 0 },
  };

  if (params.customerId) {
    where.customerId = params.customerId;
  }

  if (!isSuperadmin(user)) {
    const perm = await prisma.permission.findFirst({
      where: {
        userId: user.id,
        module: ModuleName.SALES,
        action: ActionName.VIEW,
      },
    });
    const scope = perm?.scope || DataScope.OWN;
    if (scope === DataScope.OWN) {
      where.createdById = user.id;
    }
  }

  const [outstandingSales, customerAdvances] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { saleDate: "asc" },
      include: {
        customer: { select: { id: true, customerCode: true, name: true, phone: true } },
      },
    }),
    prisma.customer.findMany({
      where: {
        ...(params.customerId ? { id: params.customerId } : {}),
        advanceBalance: { gt: 0 },
      },
      select: { id: true, customerCode: true, name: true, advanceBalance: true },
    }),
  ]);

  const agingBuckets = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0,
  };

  const customerRankingMap = new Map<string, { id: string; name: string; outstanding: number; count: number }>();
  let totalReceivables = 0;

  for (const sale of outstandingSales) {
    const bal = round2(Number(sale.balanceAmount));
    totalReceivables = round2(totalReceivables + bal);

    // Aging calculation:
    // Use dueDate if present, otherwise fallback to saleDate + 30 days standard credit policy
    const effectiveDueDate = sale.dueDate || new Date(new Date(sale.saleDate).getTime() + 30 * 24 * 60 * 60 * 1000);
    const diffMs = asOf.getTime() - effectiveDueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      agingBuckets.current = round2(agingBuckets.current + bal);
    } else if (daysOverdue <= 30) {
      agingBuckets.days1_30 = round2(agingBuckets.days1_30 + bal);
    } else if (daysOverdue <= 60) {
      agingBuckets.days31_60 = round2(agingBuckets.days31_60 + bal);
    } else if (daysOverdue <= 90) {
      agingBuckets.days61_90 = round2(agingBuckets.days61_90 + bal);
    } else {
      agingBuckets.days90Plus = round2(agingBuckets.days90Plus + bal);
    }

    // Customer ranking
    const custKey = sale.customerId;
    const existing = customerRankingMap.get(custKey) || {
      id: custKey,
      name: sale.customer.name,
      outstanding: 0,
      count: 0,
    };
    existing.outstanding = round2(existing.outstanding + bal);
    existing.count += 1;
    customerRankingMap.set(custKey, existing);
  }

  const totalAdvances = round2(
    customerAdvances.reduce((sum, c) => sum + Number(c.advanceBalance), 0)
  );

  const customerRankings = Array.from(customerRankingMap.values()).sort(
    (a, b) => b.outstanding - a.outstanding
  );

  return {
    asOfDate: asOf.toISOString(),
    totals: {
      totalReceivables,
      totalAdvances,
      netExposure: round2(totalReceivables - totalAdvances),
      invoiceCount: outstandingSales.length,
    },
    aging: agingBuckets,
    customerRankings,
    invoices: outstandingSales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber || s.saleNumber,
      saleNumber: s.saleNumber,
      customerName: s.customer.name,
      saleDate: s.saleDate,
      dueDate: s.dueDate,
      grandTotal: Number(s.grandTotal),
      paidAmount: Number(s.paidAmount),
      balanceAmount: Number(s.balanceAmount),
      paymentStatus: s.paymentStatus,
    })),
  };
}

/**
 * 8. Printable Payment Receipt Document
 */
export async function getPaymentReceiptDocument(user: SessionUser, paymentId: string) {
  const payment = await getPaymentById(user, paymentId);
  const companyConfig = await prisma.companyConfig.findUnique({ where: { id: "default" } });

  return {
    company: {
      name: companyConfig?.companyName || "AEVAN Cleaning",
      brand: companyConfig?.brandName || "GOOD TOUCH",
      gstin: companyConfig?.gstin || "10ABCDE1234F1Z5",
      phone: companyConfig?.phone || "+91-7061101285",
      email: companyConfig?.email || "info@aevancleaning.com",
      address: companyConfig?.address || "Bihar Sharif, Nalanda, Bihar",
      logoUrl: companyConfig?.logoUrl,
    },
    receipt: {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      receivedAt: payment.receivedAt,
      amount: Number(payment.amount),
      unallocatedAmount: Number(payment.unallocatedAmount),
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
      status: payment.status,
      customer: {
        id: payment.customer.id,
        code: payment.customer.customerCode,
        name: payment.customer.name,
        contactPerson: payment.customer.contactPerson,
        phone: payment.customer.phone,
        billingAddress: payment.customer.billingAddress,
        advanceBalance: Number(payment.customer.advanceBalance),
      },
      allocations: payment.allocations.map((a) => ({
        id: a.id,
        invoiceNumber: a.sale.invoiceNumber || a.sale.saleNumber,
        allocatedAmount: Number(a.allocatedAmount),
        allocationType: a.allocationType,
        isReversed: a.isReversed,
      })),
      createdBy: payment.createdBy.name,
    },
  };
}
