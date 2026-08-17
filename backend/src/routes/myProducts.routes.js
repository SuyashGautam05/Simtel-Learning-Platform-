const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getMyProducts } = require("../services/authorization.service");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

/**
 * GET /api/my-products
 * Returns only products the authenticated user is currently authorized
 * to access — derived entirely server-side from UserProductAccess
 * (SUPER_ADMIN sees every active module by virtue of their role). The
 * client cannot influence this list by passing any parameter; there
 * isn't one to pass.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const products = await getMyProducts(req.user);
    return ok(res, { products });
  } catch (err) {
    next(err);
  }
});

module.exports = router;