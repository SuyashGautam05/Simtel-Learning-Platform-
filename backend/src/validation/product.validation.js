const { z } = require("zod");

// Codes are the prefix used in generated product keys (e.g. "PLC-XXXX-...")
// — uppercase, alphanumeric, short. Enforced at the edge so a bad code
// never reaches key generation later.
const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .regex(/^[A-Z0-9]+$/, "Code must be uppercase letters/numbers only (e.g. PLC, DSP, EMB)");

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: codeSchema,
  description: z.string().trim().max(2000).optional(),
  version: z.string().trim().max(20).default("1.0.0"),
  thumbnailUrl: z.string().trim().url().optional(),
  // Arbitrary structured config (see products/registry.js) — never
  // validated beyond "is it a plain object," since its shape is up to
  // whatever adapter eventually consumes it.
  metadata: z.record(z.any()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  version: z.string().trim().max(20).optional(),
  thumbnailUrl: z.string().trim().url().optional(),
  metadata: z.record(z.any()).optional(),
  // code is intentionally NOT editable here — it's the source of truth
  // for existing product keys (PLC-XXXX-...); changing it would orphan
  // every key already generated against the old code.
});

const setStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]),
});

const listProductsQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  includeAll: z.coerce.boolean().optional(), // SUPER_ADMIN-only escape hatch, see service
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  setStatusSchema,
  listProductsQuerySchema,
};