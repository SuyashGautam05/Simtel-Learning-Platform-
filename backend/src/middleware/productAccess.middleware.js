const { ApiError } = require("../utils/apiResponse");
const prisma = require("../config/db");
const { getUserProductAccess } = require("../services/authorization.service");

/**
 * requireProductAccess()
 * -----------------------------------------------------------------------
 * Route-param-driven module gate, keyed by the product's database id
 * (:productId) rather than its short code — this is what
 * GET /api/products/:productId/{topics,simulations,experiments} use.
 * (The code-keyed equivalent, requireModuleAccess/-Dynamic, still exists
 * for the /api/modules and generic /api/products/:code/content/:section
 * routes from earlier steps — both ultimately check the same
 * UserProductAccess data via authorization.service.js.)
 *
 * Verifies, in order, exactly what module-level authorization requires:
 *   1. Authenticated user        — req.user must exist                    -> 401
 *      (requireAuth already enforces this upstream; this is defense in
 *      depth, not the only check — see the spec's explicit call-out.)
 *   2. User status               — must be ACTIVE                         -> 403
 *   3. Product status            — must exist and be ACTIVE (SUPER_ADMIN
 *      bypasses status; a hidden/nonexistent product is 404, not 403, so
 *      its existence/status isn't confirmable by probing IDs)             -> 404
 *   4. Valid user-product authorization — a UserProductAccess row must
 *      exist for (user, product)                                         -> 403
 *   5. Authorization status      — that row's status must be ACTIVE       -> 403
 *   6. License expiration        — expiresAt, if set, must be in the future -> 403
 *
 * On success, attaches req.productAccess = { product, access } for the
 * route handler to reuse without a second query.
 * -----------------------------------------------------------------------
 */
function requireProductAccess() {
  return async (req, res, next) => {
    try {
      // 1. Authenticated user.
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }

      // 2. User status.
      if (req.user.status !== "ACTIVE") {
        throw new ApiError(403, "Your account is not active");
      }

      const { productId } = req.params;
      const product = await prisma.product.findUnique({ where: { id: productId } });

      // 3. Product status.
      if (!product) {
        throw new ApiError(404, "Product not found");
      }
      if (req.user.role !== "SUPER_ADMIN" && (product.status !== "ACTIVE" || product.deletedAt)) {
        throw new ApiError(404, "Product not found");
      }

      if (req.user.role === "SUPER_ADMIN") {
        req.productAccess = { product, access: null };
        return next();
      }

      if (req.user.role === "ADMIN") {
        // Admins get visibility into any active module without needing a
        // personal license — same rule as the code-keyed middleware.
        req.productAccess = { product, access: null };
        return next();
      }

      // 4. Valid user-product authorization must exist.
      const access = await getUserProductAccess(req.user.id, product.id);
      if (!access) {
        throw new ApiError(403, "You do not have access to this module");
      }

      // 5. Authorization status.
      if (access.status !== "ACTIVE") {
        throw new ApiError(
          403,
          access.status === "REVOKED"
            ? "Your access to this module has been revoked"
            : "You do not have access to this module"
        );
      }

      // 6. License expiration.
      if (access.expiresAt && access.expiresAt <= new Date()) {
        throw new ApiError(403, "Your access to this module has expired");
      }

      req.productAccess = { product, access };
      next();
    } catch (err) {
      next(err instanceof ApiError ? err : new ApiError(500, "Module access check failed"));
    }
  };
}

module.exports = { requireProductAccess };