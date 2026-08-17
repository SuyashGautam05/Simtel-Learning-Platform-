const { ApiError } = require("../utils/apiResponse");
const prisma = require("../config/db");
const { getUserProductAccess, isAccessValid } = require("../services/authorization.service");

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
  return requireModuleAccessDynamic(() => productCode);
}

/**
 * requireModuleAccessDynamic(resolveCode)
 * Same checks as requireModuleAccess, but the product code is resolved
 * from the request at call time (e.g. a route param) instead of being
 * fixed at route-definition time. This is what the generic
 * /api/products/:code/content/:section dispatcher uses — one route
 * definition serves every module, so the code can't be hardcoded per call.
 */
function requireModuleAccessDynamic(resolveCode) {
  return async (req, res, next) => {
    try {
      const productCode = String(resolveCode(req)).toUpperCase();

      if (req.user.role === "SUPER_ADMIN") {
        const product = await prisma.product.findUnique({ where: { code: productCode } });
        if (!product) throw new ApiError(404, `Module "${productCode}" is not available`);
        req.moduleAccess = { product, access: null };
        return next();
      }

      const product = await prisma.product.findUnique({
        where: { code: productCode },
      });

      if (!product || product.status !== "ACTIVE" || product.deletedAt) {
        throw new ApiError(404, `Module "${productCode}" is not available`);
      }

      if (req.user.role === "ADMIN") {
        // Admins get visibility, not the student experience itself.
        req.moduleAccess = { product, access: null };
        return next();
      }

      const access = await getUserProductAccess(req.user.id, product.id);

      if (!isAccessValid(access)) {
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

module.exports = { requireModuleAccess, requireModuleAccessDynamic };