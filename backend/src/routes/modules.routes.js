const express = require("express");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireModuleAccess } = require("../middleware/moduleAccess.middleware");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

/**
 * GET /api/modules
 * Returns every active Product, flagged with whether the logged-in
 * user currently holds a valid UserProductAccess row for it. Powers
 * the "Module Library" screen (locked vs unlocked cards).
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
    });

    let unlockedIds = new Set();
    if (req.user.role === "SUPER_ADMIN") {
      unlockedIds = new Set(products.map((p) => p.id));
    } else if (req.user.role === "USER") {
      const access = await prisma.userProductAccess.findMany({
        where: {
          userId: req.user.id,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { productId: true },
      });
      unlockedIds = new Set(access.map((a) => a.productId));
    }

    const payload = products.map((p) => ({ ...p, unlocked: unlockedIds.has(p.id) }));
    return ok(res, { modules: payload });
  } catch (err) {
    next(err);
  }
});

/**
 * EXAMPLE pattern for a real module's protected content routes.
 * Every new Simtel module follows this exact shape — no core changes
 * required:
 *
 *   router.get("/plc/theory", requireAuth, requireModuleAccess("PLC"), handler)
 */
router.get(
  "/:code/theory",
  requireAuth,
  (req, res, next) => requireModuleAccess(req.params.code.toUpperCase())(req, res, next),
  (req, res) => {
    return ok(res, {
      message: `Theory content for ${req.moduleAccess.product.name} (placeholder)`,
    });
  }
);

module.exports = router;