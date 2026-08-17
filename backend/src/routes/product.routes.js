const express = require("express");
const productController = require("../controllers/product.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin } = require("../middleware/role.middleware");
const { requireModuleAccessDynamic } = require("../middleware/moduleAccess.middleware");
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
// GENERIC CONTENT DISPATCH — the plug-in point for real simulation apps.
// One route serves every module's theory/topics/simulations/experiments/
// quizzes/projects. The core platform never imports a module's content
// code; it only calls whatever adapter is registered for that module's
// code (see src/products/registry.js). Product-key access is enforced
// here exactly the same way as any other module content route — a module
// having no adapter yet doesn't skip the access check.
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