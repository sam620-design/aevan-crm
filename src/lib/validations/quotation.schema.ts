import { z } from "zod";

export const quotationItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be strictly positive"),
  unitPrice: z
    .number({ invalid_type_error: "Unit price must be a number" })
    .nonnegative("Unit price cannot be negative"),
  discount: z
    .number({ invalid_type_error: "Discount must be a number" })
    .nonnegative("Discount cannot be negative")
    .default(0),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%")
    .default(18.0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  validUntil: z.string().min(4, "Valid until date is required"),
  deliveryCharges: z.number().nonnegative("Delivery charges cannot be negative").default(0),
  notes: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1, "At least one product item is required"),
});

export const updateQuotationSchema = z.object({
  validUntil: z.string().optional(),
  deliveryCharges: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(quotationItemSchema).min(1).optional(),
});

export const rejectQuotationSchema = z.object({
  reason: z.string().optional().nullable(),
});

export const reopenQuotationSchema = z.object({
  reason: z.string().min(3, "Reopening reason is mandatory and must be at least 3 characters"),
});
