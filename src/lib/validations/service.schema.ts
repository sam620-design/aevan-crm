import { z } from "zod";
import {
  StaffAccessType,
  ServiceStatus,
  ServiceCategory,
  ServiceBillingStatus,
} from "@prisma/client";
import { normalizePhone } from "./customer.schema";

// -----------------------------------------------------------------
// STAFF ACCESS CONTROL SCHEMAS (SUPERADMIN ONLY)
// -----------------------------------------------------------------

export const createStaffAccessGrantSchema = z.object({
  adminId: z.string().uuid("Invalid Admin user ID"),
  staffId: z.string().uuid("Invalid Staff user ID"),
  accessType: z.nativeEnum(StaffAccessType),
  reason: z.string().min(3, "Audit reason must be at least 3 characters"),
});

export const revokeStaffAccessGrantSchema = z.object({
  adminId: z.string().uuid("Invalid Admin user ID"),
  staffId: z.string().uuid("Invalid Staff user ID"),
  accessType: z.nativeEnum(StaffAccessType),
  reason: z.string().min(3, "Revocation reason must be at least 3 characters"),
});

// -----------------------------------------------------------------
// CLEANING SERVICES VALIDATION SCHEMAS
// -----------------------------------------------------------------

export const createCleaningServiceSchema = z.object({
  customerId: z.string().uuid().optional().nullable().or(z.literal("")),
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerPhone: z.string().min(10, "Valid 10-digit phone number is required").transform(normalizePhone),
  customerEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  serviceAddress: z.string().min(3, "Service address is required"),
  propertyType: z.string().optional().nullable().default("Residential"),
  propertySize: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable().or(z.literal("")),
  category: z.nativeEnum(ServiceCategory).default(ServiceCategory.DEEP_CLEANING),
  customCategory: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Valid scheduled date is required",
  }),
  timeSlot: z.string().optional().nullable(),
  assignedStaffId: z.string().uuid().optional().nullable().or(z.literal("")),
  estimatedPrice: z.coerce.number().min(0, "Estimated price cannot be negative").default(0),
});

export const updateCleaningServiceSchema = createCleaningServiceSchema.partial();

export const updateServiceStatusSchema = z.object({
  status: z.nativeEnum(ServiceStatus),
  reason: z.string().optional().nullable(),
  finalPrice: z.coerce.number().min(0).optional().nullable(),
  completionNotes: z.string().optional().nullable(),
  beforePhotos: z.array(z.string()).optional().default([]),
  afterPhotos: z.array(z.string()).optional().default([]),
  materialsUsed: z
    .array(
      z.object({
        productId: z.string().optional().nullable(),
        productName: z.string(),
        quantity: z.number().positive(),
        unit: z.string().default("pcs"),
      })
    )
    .optional()
    .nullable(),
  followUpDate: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Valid follow-up date required",
    }),
});

export const assignServiceStaffSchema = z.object({
  assignedStaffId: z.string().uuid("Valid Staff ID is required"),
  notes: z.string().optional().nullable(),
});
