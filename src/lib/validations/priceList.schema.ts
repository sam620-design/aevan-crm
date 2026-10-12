import { z } from "zod";
import { CustomerType } from "@prisma/client";

export const priceListSchema = z.object({
  name: z.string().min(2, "Price list name must be at least 2 characters"),
  type: z.nativeEnum(CustomerType).default(CustomerType.RETAIL),
  description: z.string().optional().nullable(),
  discountPercentage: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .default(0),
  isDefault: z.boolean().default(false),
});

export const productPriceSchema = z.object({
  priceListId: z.string().uuid("Invalid price list ID"),
  productId: z.string().uuid("Invalid product ID"),
  customPrice: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
});

export const priceOverrideSchema = z.object({
  originalPrice: z.number().min(0),
  overriddenPrice: z.number().min(0, "Overridden price cannot be negative"),
  reason: z.string().min(5, "Mandatory override reason must be provided (min 5 chars)"),
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});
