const prisma = require("../config/db");
const { ApiError, ok } = require("../utils/apiResponse");
const { getUserProductAccess } = require("../services/authorization.service");
const { sanitizeProduct } = require("../services/product.service");

/**
 * GET /api/products/:productId/access
 * -----------------------------------------------------------------------
 * Deliberately never returns 403 — this endpoint answers "would I be let
 * in?" as data, not as a pass/fail gate. The actual gate is
 * requireProductAccess(), used on the content routes below. A locked
 * module is a normal, expected response here (hasAccess: false), not an
 * error — that's what lets the frontend render a "locked" card instead of
 * treating every unauthorized module as a thrown exception.
 *
 * Still returns 401 (via requireAuth upstream) if not logged in at all,
 * and 404 if the product genuinely doesn't exist or is hidden from this
 * role (draft/archived/deleted) — those aren't "access" questions, they're
 * "this resource doesn't apply to you" questions.
 * -----------------------------------------------------------------------
 */
async function checkAccess(req, res, next) {
  try {
    const { productId } = req.params;
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    if (req.user.role !== "SUPER_ADMIN" && (product.status !== "ACTIVE" || product.deletedAt)) {
      throw new ApiError(404, "Product not found");
    }

    if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") {
      return ok(res, {
        hasAccess: true,
        product: sanitizeProduct(product, { role: req.user.role, unlocked: true }),
        expiresAt: null,
      });
    }

    const access = await getUserProductAccess(req.user.id, product.id);
    const hasAccess =
      !!access && access.status === "ACTIVE" && (!access.expiresAt || access.expiresAt > new Date());

    return ok(res, {
      hasAccess,
      product: sanitizeProduct(product, { role: req.user.role, unlocked: hasAccess }),
      expiresAt: hasAccess ? access.expiresAt : null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkAccess };