const express = require("express");
const { z } = require("zod");
const { nanoid } = require("nanoid");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

router.use(requireAuth);

// ---- Product key generation (SUPER_ADMIN only) ----------------------

const generateKeysSchema = z.object({
  productCode: z.string().min(2),
  quantity: z.number().int().min(1).max(500).default(1),
  collegeId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

function randomSegment() {
  return nanoid(4).toUpperCase().replace(/[^A-Z0-9]/g, "X");
}

function buildKeyString(productCode) {
  return `${productCode}-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

router.post("/product-keys/generate", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const { productCode, quantity, collegeId, expiresAt } = generateKeysSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { code: productCode.toUpperCase() } });
    if (!product) return res.status(404).json({ success: false, message: "Unknown product code" });

    const keys = await prisma.$transaction(
      Array.from({ length: quantity }).map(() =>
        prisma.productKey.create({
          data: {
            keyString: buildKeyString(product.code),
            productId: product.id,
            collegeId: collegeId || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            generatedByUserId: req.user.id,
          },
        })
      )
    );

    return ok(res, { keys }, "Product keys generated", 201);
  } catch (err) {
    next(err);
  }
});

// ---- Assign a key to a student (SUPER_ADMIN or ADMIN of that college)

const assignKeySchema = z.object({
  keyString: z.string(),
  userId: z.string(),
});

router.post("/product-keys/assign", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const { keyString, userId } = assignKeySchema.parse(req.body);

    const key = await prisma.productKey.findUnique({ where: { keyString } });
    if (!key) return res.status(404).json({ success: false, message: "Product key not found" });
    if (key.status !== "UNUSED") {
      return res.status(409).json({ success: false, message: `Key is already ${key.status.toLowerCase()}` });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

    if (req.user.role === "ADMIN" && targetUser.collegeId !== req.user.collegeId) {
      return res.status(403).json({ success: false, message: "You can only assign keys to students in your own college" });
    }

    const updated = await prisma.productKey.update({
      where: { id: key.id },
      data: { status: "ASSIGNED", assignedToUserId: userId, assignedAt: new Date() },
    });

    return ok(res, { key: updated }, "Key assigned successfully");
  } catch (err) {
    next(err);
  }
});

// ---- Revoke a key -----------------------------------------------------

router.post("/product-keys/:id/revoke", requireRole("SUPER_ADMIN", "ADMIN"), async (req, res, next) => {
  try {
    const key = await prisma.productKey.findUnique({ where: { id: req.params.id } });
    if (!key) return res.status(404).json({ success: false, message: "Key not found" });

    if (req.user.role === "ADMIN" && key.collegeId !== req.user.collegeId) {
      return res.status(403).json({ success: false, message: "Not permitted" });
    }

    const updated = await prisma.productKey.update({
      where: { id: key.id },
      data: { status: "REVOKED" },
    });

    return ok(res, { key: updated }, "Key revoked");
  } catch (err) {
    next(err);
  }
});

// ---- Platform statistics (SUPER_ADMIN) --------------------------------

router.get("/stats", requireRole("SUPER_ADMIN"), async (req, res, next) => {
  try {
    const [colleges, users, products, activeKeys] = await Promise.all([
      prisma.college.count(),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productKey.count({ where: { status: "ASSIGNED" } }),
    ]);
    return ok(res, { colleges, students: users, activeModules: products, activeKeys });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
