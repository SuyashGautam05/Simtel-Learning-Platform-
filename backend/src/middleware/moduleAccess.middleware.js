const { ApiError } = require("../utils/apiResponse");
const prisma = require("../config/db");

/**
 * requireModuleAccess(productCode)
 * -----------------------------------------------------------------
 * This is the ONE gate every module route passes through.
 *
 * A user (student) may access a module's theory/simulation/experiment
 * routes only if they hold an ASSIGNED, non-expired ProductKey for
 * that Product. SUPER_ADMIN always passes (platform owner access).
 * ADMIN passes for read-only/reporting purposes on their own college's
 * data (adjust per-route as needed) but does not "consume" a key.
 *
 * Adding a new module (e.g. "DSP") never requires touching this file —
 * you just call requireModuleAccess("DSP") on that module's routes,
 * and make sure a Product row with code "DSP" exists.
 * -----------------------------------------------------------------
 */
function requireModuleAccess(productCode) {
  return async (req, res, next) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return next();

      const product = await prisma.product.findUnique({
        where: { code: productCode },
      });

      if (!product || !product.isActive) {
        throw new ApiError(404, `Module "${productCode}" is not available`);
      }

      if (req.user.role === "ADMIN") {
        // Admins get visibility, not the student experience itself.
        // Tighten/loosen this per your product decisions.
        return next();
      }

      const activeKey = await prisma.productKey.findFirst({
        where: {
          productId: product.id,
          assignedToUserId: req.user.id,
          status: "ASSIGNED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!activeKey) {
        throw new ApiError(
          403,
          `You do not have an active license for the "${product.name}" module`
        );
      }

      req.moduleAccess = { product, productKey: activeKey };
      next();
    } catch (err) {
      next(err instanceof ApiError ? err : new ApiError(500, "Module access check failed"));
    }
  };
}

module.exports = { requireModuleAccess };
