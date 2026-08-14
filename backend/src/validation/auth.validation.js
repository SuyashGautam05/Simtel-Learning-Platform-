const { z } = require("zod");

// Deliberately not too strict on special characters (avoids locking out
// legitimate passwords), but requires meaningful length + a mix of
// character classes so trivially guessable passwords are rejected.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  email: emailSchema,
  password: passwordSchema,
  // Optional: students can associate themselves with a college by its
  // public code at signup. Role is never accepted from the client —
  // public registration always creates a USER account.
  collegeCode: z.string().trim().min(2).max(40).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

module.exports = { registerSchema, loginSchema, changePasswordSchema, passwordSchema, emailSchema };