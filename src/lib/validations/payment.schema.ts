import { z } from "zod";
import { PaymentMethod, AllocationType } from "@prisma/client";

/**
 * Single invoice allocation schema
 */
export const invoiceAllocationItemSchema = z.object({
  saleId: z.string().min(1, "Sale ID is required"),
  amount: z
    .number({ invalid_type_error: "Allocated amount must be a number" })
    .positive("Allocated amount must be strictly greater than 0")
    .max(100000000, "Allocated amount exceeds allowable limit"),
});

/**
 * Payment creation schema
 */
export const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  amount: z
    .number({ invalid_type_error: "Payment amount must be a number" })
    .positive("Payment amount must be strictly greater than 0")
    .max(100000000, "Payment amount exceeds allowable limit"),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  receivedAt: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid received date"),
  referenceNumber: z.string().max(100, "Reference number cannot exceed 100 characters").optional().nullable(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
  allocationMode: z.enum(["MANUAL", "OLDEST_FIRST", "NONE"]).default("MANUAL"),
  allocations: z.array(invoiceAllocationItemSchema).optional().default([]),
  acceptAdvance: z.boolean().default(false),
  idempotencyKey: z.string().max(100).optional().nullable(),
});

/**
 * Manual allocation of an existing payment
 */
export const manualAllocatePaymentSchema = z.object({
  allocations: z
    .array(invoiceAllocationItemSchema)
    .min(1, "At least one invoice allocation is required"),
});

/**
 * Application of existing customer advance balance to invoices
 */
export const applyCustomerAdvanceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  allocations: z
    .array(invoiceAllocationItemSchema)
    .min(1, "At least one invoice allocation is required"),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * Payment reversal schema
 */
export const reversePaymentSchema = z.object({
  reason: z
    .string({ required_error: "Reversal reason is mandatory" })
    .trim()
    .min(3, "Reversal reason must be at least 3 characters long")
    .max(500, "Reversal reason cannot exceed 500 characters"),
});

/**
 * Query schema for Customer Ledger
 */
export const customerLedgerQuerySchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid end date"),
});

/**
 * Query schema for Receivables
 */
export const receivablesQuerySchema = z.object({
  customerId: z.string().optional(),
  asOfDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), "Invalid asOf date"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ManualAllocatePaymentInput = z.infer<typeof manualAllocatePaymentSchema>;
export type ApplyCustomerAdvanceInput = z.infer<typeof applyCustomerAdvanceSchema>;
export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;
