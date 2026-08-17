const { z } = require("zod");

const generateKeysSchema = z.object({
  productCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/),
  quantity: z.number().int().min(1).max(500).default(1),
  collegeId: z.string().cuid().optional(),
  maxActivations: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional(),
  // Free-form, validated only as "is it a plain object" — see
  // ProductKey.activationRules in schema.prisma.
  activationRules: z.record(z.any()).optional(),
});

const listKeysQuerySchema = z.object({
  status: z.enum(["UNUSED", "ACTIVE", "REVOKED", "EXPIRED", "EXHAUSTED"]).optional(),
  productCode: z.string().trim().toUpperCase().optional(),
  collegeId: z.string().cuid().optional(),
  // Exact match only — we never store the raw key, so partial/substring
  // search across the secret itself is structurally impossible. Search by
  // the last 4 characters (shown on the masked key) instead.
  lastFour: z.string().trim().length(4).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// Deliberately the ONLY field accepted. Even if a client sends
// `productId` alongside `key`, Zod's default "strip unknown keys"
// behavior discards it before this ever reaches the service layer —
// the product is always derived from the key itself, never from the
// request body. See activation.service.js.
const activateKeySchema = z.object({
  key: z.string().trim().min(8).max(64),
});

module.exports = { generateKeysSchema, listKeysQuerySchema, activateKeySchema };