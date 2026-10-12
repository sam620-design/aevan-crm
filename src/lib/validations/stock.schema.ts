import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(2, "Location name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Location code must be at least 2 characters")
    .transform((val) => val.trim().toUpperCase()),
  address: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

export const stockTransferSchema = z
  .object({
    transferNumber: z.string().optional(),
    sourceLocationId: z.string().uuid("Invalid source location ID"),
    destinationLocationId: z.string().uuid("Invalid destination location ID"),
    productId: z.string().uuid("Invalid product ID"),
    quantity: z
      .number({ invalid_type_error: "Transfer quantity must be a number" })
      .int("Quantity must be a whole number")
      .positive("Transfer quantity must be greater than zero"),
    notes: z.string().optional().nullable(),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: "Source and destination locations must be different",
    path: ["destinationLocationId"],
  });

export const stockInwardSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().positive("Inward quantity must be positive"),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
});
