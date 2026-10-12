import { z } from "zod";
import { OutwardDisposition } from "@prisma/client";

export const outwardLineSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be strictly positive"),
  unit: z.string().default("pcs"),
});

export const createOutwardSchema = z.object({
  outwardNumber: z.string().optional(),
  sourceLocationId: z.string().uuid("Invalid source location ID"),
  destinationLocationId: z.string().uuid("Invalid destination location ID").optional().nullable(),
  purpose: z.string().min(2, "Purpose must be at least 2 characters"),
  takenBy: z.string().min(2, "Person taking goods must be at least 2 characters"),
  destination: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(outwardLineSchema).min(1, "At least one product line is required"),
});

export const updateOutwardSchema = z.object({
  sourceLocationId: z.string().uuid().optional(),
  destinationLocationId: z.string().uuid().optional().nullable(),
  purpose: z.string().min(2).optional(),
  takenBy: z.string().min(2).optional(),
  destination: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(outwardLineSchema).min(1).optional(),
});

export const reconciliationItemSchema = z
  .object({
    lineId: z.string().uuid().optional().nullable(),
    productId: z.string().uuid("Invalid product ID"),
    disposition: z.nativeEnum(OutwardDisposition, {
      errorMap: () => ({ message: "Invalid outward disposition type" }),
    }),
    quantity: z
      .number({ invalid_type_error: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .nonnegative("Disposition quantity cannot be negative"),
    linkedSaleId: z.string().uuid().optional().nullable(),
    linkedTransferId: z.string().uuid().optional().nullable(),
    returnLocationId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.disposition === OutwardDisposition.OTHER) {
        return !!data.notes && data.notes.trim().length >= 3;
      }
      return true;
    },
    {
      message: "Explanatory notes are required when disposition is OTHER",
      path: ["notes"],
    }
  );

export const submitReconciliationSchema = z.object({
  items: z.array(reconciliationItemSchema).min(1, "At least one reconciliation item is required"),
});

export const approveDiscrepancySchema = z.object({
  reason: z.string().min(3, "Written discrepancy reason must be at least 3 characters"),
  notes: z.string().optional().nullable(),
});

export const returnStockAcceptanceSchema = z.object({
  reconciliationId: z.string().uuid("Invalid reconciliation item ID"),
  locationId: z.string().uuid("Invalid target return location ID"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Accepted return quantity must be positive"),
  notes: z.string().optional().nullable(),
});

export const closeOutwardSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const reopenOutwardSchema = z.object({
  reason: z.string().min(3, "Reopening reason is mandatory and must be at least 3 characters"),
});
