import { z } from "zod";

export const saleItemSchema = z.object({
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

export const createSaleSchema = z.object({
  orderId: z.string().uuid().optional().nullable(),
  quotationId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid("Invalid customer ID"),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  deliveryCharges: z.number().nonnegative("Delivery charges cannot be negative").default(0),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one product item is required"),
});

export const updateSaleSchema = z.object({
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  deliveryCharges: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1).optional(),
});

export const finalizeSaleSchema = z.object({
  notes: z.string().optional().nullable(),
});
