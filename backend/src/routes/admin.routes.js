const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin, requireAdmin } = require("../middleware/role.middleware");
const { getPlatformStats } = require("../services/platformStats.service");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

router.use(requireAuth);

// NOTE: product key generation/activation now live in productKey.routes.js
// (POST /api/product-keys/generate, POST /api/product-keys/activate) and
// activation.service.js — that's the authoritative, hashed-key,
// audit-logged implementation. What remains here is administrative
// actions that aren't about the key itself: revoking an access grant
// directly, and platform-wide stats.

// ---- Revoke a user's access directly (SUPER_ADMIN or ADMIN of that
//      college) — distinct from revoking a key: this removes access
//      that was already granted, without touching the key's own
//      validity/activation count. ------------------------------------

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
// Never exposed to ADMIN/USER — requireSuperAdmin() is the enforcement,
// not just hiding the nav link on the frontend.

router.get("/stats", requireSuperAdmin(), async (req, res, next) => {
  try {
    const stats = await getPlatformStats();
    return ok(res, stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;