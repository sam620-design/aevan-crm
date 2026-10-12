import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z
    .string()
    .min(2, "SKU must be at least 2 characters")
    .transform((val) => val.trim().toUpperCase()),
  barcode: z
    .string()
    .trim()
    .min(3, "Barcode must be at least 3 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  description: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  unit: z.string().default("pcs"),
  basePrice: z
    .number({ invalid_type_error: "Base price must be a valid number" })
    .min(0, "Base price cannot be negative"),
  costPrice: z
    .number()
    .min(0, "Cost price cannot be negative")
    .optional()
    .nullable(),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
  minStockAlert: z
    .number()
    .int("Alert threshold must be an integer")
    .min(0, "Min stock alert cannot be negative")
    .default(10),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = productSchema.partial();
