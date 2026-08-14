const { z } = require("zod");

// SUPER_ADMIN may create ADMIN or USER accounts through this endpoint.
// Creating a SUPER_ADMIN via this endpoint is downgraded to USER rather
// than rejected outright — see user.service.js#createUser. That account
// tier is provisioned only via the seed script / direct DB access, so a
// compromised SUPER_ADMIN session can't mint new super admins through
// the app layer, but the attempt is still handled gracefully (and
// audit-logged) instead of just erroring.
const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]).default("USER"),
  // Required when a SUPER_ADMIN creates an ADMIN or a USER not tied to
  // their own request context; ignored/overridden for ADMIN callers (an
  // ADMIN can only ever create USER accounts in their own college — see
  // user.service.js).
  collegeId: z.string().cuid().optional(),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
});

const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
});

const listUsersQuerySchema = z.object({
  // No default here on purpose — "role not specified" must mean "no role
  // filter applied," not "filter to USER." A default would silently hide
  // ADMIN/SUPER_ADMIN rows from a caller who never asked to filter at all.
  role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]).optional(),
  collegeId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateOwnProfileSchema,
  listUsersQuerySchema,
};