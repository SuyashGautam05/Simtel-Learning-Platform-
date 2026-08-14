const { z } = require("zod");

const createCollegeSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().min(2).max(40),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
});

const updateCollegeSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),
});

module.exports = { createCollegeSchema, updateCollegeSchema };