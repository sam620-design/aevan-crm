import { z } from "zod";
import { CustomerType } from "@prisma/client";

// GSTIN format: 2 digits state code, 10 char PAN, 1 entity code, 1 'Z', 1 checksum char
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function normalizePhone(phone: string): string {
  // Strip all non-numeric characters except leading '+'
  const cleaned = phone.replace(/[^0-9+]/g, "");
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }
  return cleaned.startsWith("+") ? cleaned : (digitsOnly ? `+91${digitsOnly}` : cleaned);
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email || !email.trim()) return null;
  return email.toLowerCase().trim();
}

export const customerSchema = z.object({
  name: z.string().min(2, "Customer or business name must have at least 2 characters"),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().min(10, "Valid 10-digit contact number is required").transform(normalizePhone),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.RETAIL),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => !val || GSTIN_REGEX.test(val), {
      message: "Invalid GSTIN format (e.g. 10ABCDE1234F1Z5)",
    })
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z.string().optional().nullable(),
  priceListId: z.string().uuid("Invalid price list ID").optional().nullable().or(z.literal("")),
  assignedToId: z.string().uuid().optional().nullable().or(z.literal("")),
});

export const createCustomerSchema = customerSchema;
export const updateCustomerSchema = customerSchema.partial();
