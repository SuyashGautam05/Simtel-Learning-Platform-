const express = require("express");
const productController = require("../controllers/product.controller");
const productAccessController = require("../controllers/productAccess.controller");
const moduleIntegrationController = require("../controllers/moduleIntegration.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin } = require("../middleware/role.middleware");
const { requireModuleAccessDynamic } = require("../middleware/moduleAccess.middleware");
const { requireProductAccess } = require("../middleware/productAccess.middleware");
const { getAdapter, SECTIONS } = require("../products/registry");
const { ApiError, ok } = require("../utils/apiResponse");

const router = express.Router();

router.use(requireAuth);

// Visible to every authenticated role — scoping by role happens inside
// the service layer (SUPER_ADMIN sees everything, ADMIN/USER see only
// ACTIVE modules, with USER responses annotated with `unlocked`).
router.get("/", productController.list);
router.get("/:id", productController.getOne);

// SUPER_ADMIN only — creation, mutation, lifecycle, and deletion of a
// module are platform-owner actions. requireSuperAdmin() is the backend
// enforcement; there is no client-side-only gate anywhere in this system.
router.post("/", requireSuperAdmin(), productController.create);
router.put("/:id", requireSuperAdmin(), productController.update);
router.patch("/:id/status", requireSuperAdmin(), productController.setStatus);
router.delete("/:id", requireSuperAdmin(), productController.remove);

// Extra: module statistics (SUPER_ADMIN only), not one of the 6 required
// CRUD routes but needed for the "view module statistics" capability.
router.get("/:id/stats", requireSuperAdmin(), productController.stats);

// ---------------------------------------------------------------------------
// MODULE-LEVEL AUTHORIZATION (ID-keyed)
// -----------------------------------------------------------------------
// GET /:productId/access — never gated, never 403s. Answers "would I be
// let in?" as data (hasAccess: true/false) so the frontend can render a
// locked-module card instead of catching an exception. This is the ONLY
// route in this section that doesn't use requireProductAccess.
// -----------------------------------------------------------------------
router.get("/:productId/access", productAccessController.checkAccess);

/**
 * Shared handler for the three protected content routes below. Dispatches
 * to whatever adapter is registered for this product's code (see
 * src/products/registry.js) — the route itself has no idea what a
 * "topic" or "simulation" looks like for any given module.
 */
function contentHandler(section) {
  return async (req, res, next) => {
    try {
      const { product } = req.productAccess;
      const adapter = getAdapter(product.code);
      const data = await adapter[section]({ productCode: product.code, user: req.user });
      return ok(res, data);
    } catch (err) {
      next(err);
    }
  };
}

// Each of these is fully gated by requireProductAccess() — an
// unauthenticated request gets 401, an authenticated-but-unlicensed
// request gets 403, and a nonexistent/hidden product gets 404. There is
// no separate "UI path" vs "API path" — manually navigating to
// /modules/plc in the browser and calling this endpoint directly with
// curl hit the exact same backend check.
router.get("/:productId/topics", requireProductAccess(), contentHandler("topics"));
router.get("/:productId/simulations", requireProductAccess(), contentHandler("simulations"));
router.get("/:productId/experiments", requireProductAccess(), contentHandler("experiments"));

// ---------------------------------------------------------------------------
// MODULE INTEGRATION (see MODULE_INTEGRATION.md) — the platform ↔ module
// contract. All three gated by requireProductAccess(): a student without
// a valid license for this module can't fetch a launch token or read/
// write its saved state, exactly like every other module-scoped route.
// ---------------------------------------------------------------------------
router.get("/:productId/launch", requireProductAccess(), moduleIntegrationController.launch);
router.get("/:productId/state", requireProductAccess(), moduleIntegrationController.getState);
router.put("/:productId/state", requireProductAccess(), moduleIntegrationController.putState);

// ---------------------------------------------------------------------------
// GENERIC CONTENT DISPATCH (code-keyed) — the plug-in point for real
// simulation apps, from the Product Management step. One route serves
// every module's theory/topics/simulations/experiments/quizzes/projects
// by CODE. Kept alongside the ID-keyed routes above (same underlying
// authorization data, two addressing schemes) for backward compatibility
// with anything already calling it.
// ---------------------------------------------------------------------------
router.get(
  "/:code/content/:section",
  (req, res, next) => requireModuleAccessDynamic((r) => r.params.code)(req, res, next),
  async (req, res, next) => {
    try {
      const { section } = req.params;
      if (!SECTIONS.includes(section)) {
        throw new ApiError(
          404,
          `Unknown content section "${section}". Valid sections: ${SECTIONS.join(", ")}`
        );
      }
      const adapter = getAdapter(req.moduleAccess.product.code);
      const data = await adapter[section]({
        productCode: req.moduleAccess.product.code,
        user: req.user,
      });
      return ok(res, data);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;