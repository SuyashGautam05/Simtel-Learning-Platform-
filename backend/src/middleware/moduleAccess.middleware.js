const { ApiError } = require("../utils/apiResponse");
const prisma = require("../config/db");

/**
 * requireModuleAccess(productCode)
 * -----------------------------------------------------------------
 * The one gate every module route passes through. A student may access
 * a module's theory/simulation/experiment routes only if they hold an
 * ACTIVE, non-expired UserProductAccess row for that Product.
 * SUPER_ADMIN always passes. Adding a new module never requires touching
 * this file — call requireModuleAccess("DSP") on that module's routes and
 * make sure a Product row with code "DSP" exists.
 * -----------------------------------------------------------------
 */
function requireModuleAccess(productCode) {
  return async (req, res, next) => {
    try {
      if (req.user.role === "SUPER_ADMIN") return next();

      const product = await prisma.product.findUnique({
        where: { code: productCode },
      });

      if (!product || product.status !== "ACTIVE" || product.deletedAt) {
        throw new ApiError(404, `Module "${productCode}" is not available`);
      }

      if (req.user.role === "ADMIN") {
        // Admins get visibility, not the student experience itself.
        return next();
      }

      const access = await prisma.userProductAccess.findUnique({
        where: { userId_productId: { userId: req.user.id, productId: product.id } },
      });

      const isValid =
        access &&
        access.status === "ACTIVE" &&
        (!access.expiresAt || access.expiresAt > new Date());

      if (!isValid) {
        throw new ApiError(
          403,
          `You do not have an active license for the "${product.name}" module`
        );
      }

      req.moduleAccess = { product, access };
      next();
    } catch (err) {
      next(err instanceof ApiError ? err : new ApiError(500, "Module access check failed"));
    }
  };
}

module.exports = { requireModuleAccess };