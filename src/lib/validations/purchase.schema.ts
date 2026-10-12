import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

// =============================================================
// 1. SUPPLIER SCHEMAS
// =============================================================
export const createSupplierSchema = z.object({
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters"),
  businessName: z.string().trim().optional().nullable(),
  contactPerson: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(7, "Phone number must be at least 7 characters"),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  billingAddress: z.string().trim().optional().nullable(),
  gstin: z.string().trim().optional().nullable(),
  category: z.string().trim().default("General"),
  paymentTerms: z.string().trim().default("Net 30"),
  notes: z.string().trim().optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// =============================================================
// 2. PURCHASE ORDER SCHEMAS
// =============================================================
export const poItemSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    orderedQuantity: z.number().int().positive("Ordered quantity must be greater than 0").optional(),
    quantity: z.number().int().positive("Quantity must be greater than 0").optional(),
    unitPrice: z.number().positive("Unit price must be strictly positive"),
    discount: z.number().min(0, "Discount cannot be negative").default(0),
    taxRate: z.number().min(0).max(100, "Tax rate must be between 0% and 100%").default(18.0),
  })
  .refine(
    (data) => (data.orderedQuantity !== undefined && data.orderedQuantity > 0) || (data.quantity !== undefined && data.quantity > 0),
    { message: "Ordered quantity must be greater than 0" }
  )
  .transform((data) => ({
    ...data,
    orderedQuantity: data.orderedQuantity ?? data.quantity ?? 1,
    quantity: data.quantity ?? data.orderedQuantity ?? 1,
  }));

export const createPurchaseOrderSchema = z
  .object({
    supplierId: z.string().min(1, "Supplier is required"),
    locationId: z.string().min(1, "Delivery location is required"),
    orderDate: z.string().optional(),
    expectedDeliveryDate: z.string().optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    freightCharges: z.number().min(0, "Freight cannot be negative").default(0).optional(),
    freight: z.number().min(0, "Freight cannot be negative").default(0).optional(),
    items: z.array(poItemSchema).min(1, "At least one item is required on the purchase order"),
  })
  .transform((data) => ({
    ...data,
    freightCharges: data.freightCharges ?? data.freight ?? 0,
    freight: data.freight ?? data.freightCharges ?? 0,
  }));

// =============================================================
// 3. GOODS RECEIPT SCHEMAS
// =============================================================
export const grnLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  receivedQty: z.number().int().positive("Received quantity must be positive"),
  acceptedQty: z.number().int().min(0, "Accepted quantity cannot be negative"),
  rejectedQty: z.number().int().min(0, "Rejected quantity cannot be negative").default(0),
  rejectionReason: z.string().max(300).optional().nullable(),
});

export const createGoodsReceiptSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  destinationLocationId: z.string().min(1, "Destination warehouse is required"),
  purchaseOrderId: z.string().optional().nullable(),
  receivedDate: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  lines: z.array(grnLineSchema).min(1, "At least one receipt line is required"),
});

// =============================================================
// 4. SUPPLIER BILL / INVOICE SCHEMAS
// =============================================================
export const billItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().optional().nullable(),
  quantity: z.number().int().positive("Quantity must be positive"),
  unitPrice: z.number().positive("Unit price must be positive"),
  taxRate: z.number().min(0).max(100).default(18.0),
});

export const createSupplierBillSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  supplierInvoiceNumber: z.string().trim().min(1, "Supplier invoice number is mandatory"),
  purchaseOrderId: z.string().optional().nullable(),
  goodsReceiptId: z.string().optional().nullable(),
  billDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  freight: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(billItemSchema).min(1, "At least one item is required on the bill"),
});

// =============================================================
// 5. PURCHASE RETURN SCHEMAS
// =============================================================
export const purchaseReturnLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().positive("Return quantity must be positive"),
  unitPrice: z.number().min(0).default(0),
});

export const createPurchaseReturnSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  sourceLocationId: z.string().min(1, "Source warehouse is required"),
  goodsReceiptId: z.string().optional().nullable(),
  supplierBillId: z.string().optional().nullable(),
  reason: z.string().trim().min(3, "Return reason must be at least 3 characters"),
  supplierCreditNoteRef: z.string().max(100).optional().nullable(),
  lines: z.array(purchaseReturnLineSchema).min(1, "At least one product line is required"),
});

// =============================================================
// 6. SUPPLIER PAYMENT SCHEMAS
// =============================================================
export const billAllocationItemSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  amount: z.number().positive("Allocated amount must be positive"),
});

export const createSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  amount: z.number().positive("Payment amount must be positive"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  allocations: z.array(billAllocationItemSchema).optional().default([]),
});

export const reverseSupplierPaymentSchema = z.object({
  reason: z.string().trim().min(3, "Reversal reason must be at least 3 characters"),
});

// =============================================================
// 7. BUSINESS EXPENSE SCHEMAS
// =============================================================
export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Expense category is required"),
  title: z.string().trim().min(2, "Expense title must be at least 2 characters"),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive("Expense subtotal must be strictly positive"),
  tax: z.number().min(0, "Tax cannot be negative").default(0),
  expenseDate: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNumber: z.string().max(100).optional().nullable(),
  supplierId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
});

export const rejectExpenseSchema = z.object({
  reason: z.string().trim().min(3, "Rejection reason must be at least 3 characters"),
});
