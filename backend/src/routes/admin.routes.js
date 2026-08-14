const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin, requireAdmin } = require("../middleware/role.middleware");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

router.use(requireAuth);

// ---- Product key generation (SUPER_ADMIN only) ----------------------

const generateKeysSchema = z.object({
  productCode: z.string().min(2),
  quantity: z.number().int().min(1).max(500).default(1),
  collegeId: z.string().optional(),
  maxActivations: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional(),
});

function randomSegment() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function buildKeyString(productCode) {
  return `${productCode}-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
}

router.post("/product-keys/generate", requireSuperAdmin(), async (req, res, next) => {
  try {
    const { productCode, quantity, collegeId, maxActivations, expiresAt } =
      generateKeysSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { code: productCode.toUpperCase() },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Unknown product code" });
    }

    const keys = await prisma.$transaction(
      Array.from({ length: quantity }).map(() =>
        prisma.productKey.create({
          data: {
            key: buildKeyString(product.code),
            productId: product.id,
            collegeId: collegeId || null,
            maxActivations,
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

// ---- Assign/activate a key for a student (SUPER_ADMIN or ADMIN of that college)

const assignKeySchema = z.object({
  key: z.string(),
  userId: z.string(),
});

router.post("/product-keys/assign", requireAdmin(), async (req, res, next) => {
  try {
    const { key, userId } = assignKeySchema.parse(req.body);

    const productKey = await prisma.productKey.findUnique({ where: { key } });
    if (!productKey) {
      return res.status(404).json({ success: false, message: "Product key not found" });
    }
    if (productKey.status === "REVOKED") {
      return res.status(409).json({ success: false, message: "Key has been revoked" });
    }
    if (productKey.status === "EXPIRED") {
      return res.status(409).json({ success: false, message: "Key has expired" });
    }
    if (productKey.activationsCount >= productKey.maxActivations) {
      return res.status(409).json({ success: false, message: "Key has no remaining activations" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (req.user.role === "ADMIN" && targetUser.collegeId !== req.user.collegeId) {
      return res
        .status(403)
        .json({ success: false, message: "You can only assign keys to students in your own college" });
    }

    const existingAccess = await prisma.userProductAccess.findUnique({
      where: { userId_productId: { userId, productId: productKey.productId } },
    });
    if (existingAccess && existingAccess.status === "ACTIVE") {
      return res
        .status(409)
        .json({ success: false, message: "This user already has active access to that module" });
    }

    const [updatedKey, access] = await prisma.$transaction([
      prisma.productKey.update({
        where: { id: productKey.id },
        data: {
          activationsCount: { increment: 1 },
          status:
            productKey.activationsCount + 1 >= productKey.maxActivations ? "EXHAUSTED" : "ACTIVE",
          activatedAt: productKey.activatedAt ?? new Date(),
          activatedByUserId: productKey.activatedByUserId ?? userId,
        },
      }),
      prisma.userProductAccess.upsert({
        where: { userId_productId: { userId, productId: productKey.productId } },
        update: { status: "ACTIVE", productKeyId: productKey.id, activatedAt: new Date(), expiresAt: productKey.expiresAt },
        create: {
          userId,
          productId: productKey.productId,
          productKeyId: productKey.id,
          status: "ACTIVE",
          expiresAt: productKey.expiresAt,
        },
      }),
    ]);

    return ok(res, { key: updatedKey, access }, "Key assigned and access granted");
  } catch (err) {
    next(err);
  }
});

// ---- Revoke a user's access (SUPER_ADMIN or ADMIN of that college) ---

const revokeAccessSchema = z.object({
  userId: z.string(),
  productId: z.string(),
});

router.post("/product-access/revoke", requireAdmin(), async (req, res, next) => {
  try {
    const { userId, productId } = revokeAccessSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });
    if (req.user.role === "ADMIN" && targetUser.collegeId !== req.user.collegeId) {
      return res.status(403).json({ success: false, message: "Not permitted" });
    }

    const access = await prisma.userProductAccess.update({
      where: { userId_productId: { userId, productId } },
      data: { status: "REVOKED" },
    });

    return ok(res, { access }, "Access revoked");
  } catch (err) {
    next(err);
  }
});

// ---- Platform statistics (SUPER_ADMIN) --------------------------------

router.get("/stats", requireSuperAdmin(), async (req, res, next) => {
  try {
    const [colleges, students, products, activeAccessGrants] = await Promise.all([
      prisma.college.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: "USER", deletedAt: null } }),
      prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.userProductAccess.count({ where: { status: "ACTIVE" } }),
    ]);
    return ok(res, { colleges, students, activeModules: products, activeAccessGrants });
  } catch (err) {
    next(err);
  }
});

module.exports = router;