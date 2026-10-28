import { z } from "zod";

/* ------------------------------------------------------------------ Auth */

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(60),
    lastName: z.string().min(1, "Last name is required").max(60),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .optional()
      .refine((v) => !v || /^(\+?234|0)?[\d\s-]{10,15}$/.test(v), "Enter a valid Nigerian phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["student", "landlord", "manager", "agent"]),
    acceptTerms: z.literal(true, {
      error: "You must accept the terms to continue",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/* ----------------------------------------------------------------- Contact */

export const contactSchema = z.object({
  name: z.string().min(1, "Your name is required").max(80),
  email: z.string().email("Enter a valid email address"),
  subject: z.string().min(1, "Subject is required").max(120),
  category: z.enum(["general", "press", "partnership", "support", "safety"]),
  message: z.string().min(10, "Please write at least 10 characters").max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

/* ------------------------------------------------------------- Support ticket */

export const supportTicketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(120),
  category: z.enum([
    "Bookings",
    "Payments",
    "Verification",
    "Account",
    "Property listing",
    "Safety",
    "Other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  message: z.string().min(10, "Please write at least 10 characters").max(3000),
});
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;

/* ------------------------------------------------------------- Profile */

export const studentProfileSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^(\+?234|0)?[\d\s-]{10,15}$/.test(v), "Enter a valid Nigerian phone number"),
  universityId: z.string().optional(),
  matricNumber: z.string().max(40).optional(),
  level: z.string().max(20).optional(),
  department: z.string().max(80).optional(),
  bio: z.string().max(400).optional(),
  emergencyContactName: z.string().max(80).optional(),
  emergencyContactPhone: z
    .string()
    .optional()
    .refine((v) => !v || /^(\+?234|0)?[\d\s-]{10,15}$/.test(v), "Enter a valid Nigerian phone number"),
});
export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

export const landlordProfileSchema = z.object({
  displayName: z.string().min(2, "Display name is required").max(80),
  businessName: z.string().max(120).optional(),
  officeAddress: z.string().max(200).optional(),
  rcNumber: z.string().max(40).optional(),
});
export type LandlordProfileInput = z.infer<typeof landlordProfileSchema>;

/* ------------------------------------------------------- Property creation */

export const propertyStep1Schema = z.object({
  name: z.string().min(5, "Property name must be at least 5 characters").max(100),
  type: z.enum([
    "hostel_block",
    "apartment_building",
    "terrace_house",
    "detached_house",
    "self_contain_block",
    "shared_house",
  ]),
  description: z.string().min(20, "Write at least 20 characters").max(2000),
});
export type PropertyStep1 = z.infer<typeof propertyStep1Schema>;

export const propertyStep2Schema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  neighbourhoodId: z.string().min(1, "Select a neighbourhood"),
  universityId: z.string().min(1, "Select a university"),
  publicAddressLine: z.string().min(5, "Public address line is required").max(160),
  privateAddressLine: z.string().min(5, "Private address is required").max(200),
});
export type PropertyStep2 = z.infer<typeof propertyStep2Schema>;

export const propertyStep3Schema = z.object({
  facilities: z.array(z.string()).min(1, "Select at least one facility"),
  rules: z.array(z.string()).default([]),
});
export type PropertyStep3 = z.infer<typeof propertyStep3Schema>;

/* ------------------------------------------------------- Floor + room */

export const floorSchema = z.object({
  label: z.string().min(1, "Floor label is required").max(40),
  level: z.number().int().min(-3).max(50),
  defaultPriceKobo: z
    .number()
    .int()
    .min(0, "Default price cannot be negative")
    .max(1_000_000_000, "Default price is unreasonably large")
    .optional(),
  description: z.string().max(400).optional(),
});
export type FloorInput = z.infer<typeof floorSchema>;

export const roomSchema = z.object({
  identifier: z
    .string()
    .min(1, "Room identifier is required")
    .max(20, "Identifier is too long")
    .regex(/^[A-Za-z0-9\-_]+$/, "Use letters, numbers, dashes or underscores only"),
  floorId: z.string().min(1, "Select a floor"),
  unitType: z.enum([
    "self_contain",
    "single_room",
    "shared_room",
    "bed_space",
    "apartment",
    "studio",
  ]),
  capacity: z.number().int().min(1).max(20),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20),
  hasBalcony: z.boolean().default(false),
  hasWindow: z.boolean().default(false),
  sizeSqM: z.number().min(0).max(500).optional(),
  furnishing: z.enum(["unfurnished", "semi_furnished", "fully_furnished"]),
  facilities: z.array(z.string()).default([]),
  annualRentKobo: z
    .number()
    .int()
    .min(100000, "Annual rent is too low")
    .max(1_000_000_000, "Annual rent is unreasonably large"),
  rentalPeriod: z.enum(["annual", "biannual", "quarterly", "monthly"]),
  cautionDepositKobo: z.number().int().min(0).optional(),
  bookingTerms: z.string().max(800).optional(),
});
export type RoomInput = z.infer<typeof roomSchema>;

export const bulkRoomSchema = z.object({
  floorId: z.string().min(1, "Select a floor"),
  prefix: z.string().min(1).max(10),
  startIndex: z.number().int().min(0).max(999),
  count: z.number().int().min(1, "Create at least 1 room").max(200, "Maximum 200 rooms at once"),
  unitType: z.enum([
    "self_contain",
    "single_room",
    "shared_room",
    "bed_space",
    "apartment",
    "studio",
  ]),
  capacity: z.number().int().min(1).max(20),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().int().min(0).max(20),
  furnishing: z.enum(["unfurnished", "semi_furnished", "fully_furnished"]),
  annualRentKobo: z
    .number()
    .int()
    .min(100000)
    .max(1_000_000_000),
  rentalPeriod: z.enum(["annual", "biannual", "quarterly", "monthly"]),
  applyFloorDefault: z.boolean().default(false),
});
export type BulkRoomInput = z.infer<typeof bulkRoomSchema>;

/* ------------------------------------------------------- Booking flow */

export const bookingInitiationSchema = z.object({
  checkIn: z.string().min(1, "Check-in date is required"),
  rentalPeriod: z.enum(["annual", "biannual", "quarterly", "monthly"]),
  acceptTerms: z.literal(true, {
    error: "You must accept the booking terms",
  }),
});
export type BookingInitiationInput = z.infer<typeof bookingInitiationSchema>;
