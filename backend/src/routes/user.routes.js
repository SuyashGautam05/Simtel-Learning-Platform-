const express = require("express");
const userController = require("../controllers/user.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  requireAdmin,
  requireSuperAdmin,
  requireTargetUserInScope,
} = require("../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

// -- Self-service (any authenticated role) ---------------------------------
router.get("/me", userController.me);
router.patch("/me", userController.updateMe);

// -- Roster management (SUPER_ADMIN: everyone. ADMIN: own college's
//    students only — enforced inside the service layer, not just here) ----
router.get("/", requireAdmin(), userController.list);
router.post("/", requireAdmin(), userController.create);

// -- Single-user operations, tenant-scoped by requireTargetUserInScope -----
// This is the guard that stops "change the :userId in the URL" attacks:
// it loads the target user and 404s (not 403 — see middleware comments)
// if an ADMIN's target isn't a USER in their own college. SUPER_ADMIN
// passes through unrestricted.
router.get("/:userId", requireAdmin(), requireTargetUserInScope(), userController.getOne);
router.patch("/:userId", requireAdmin(), requireTargetUserInScope(), userController.update);
router.post("/:userId/activate", requireAdmin(), requireTargetUserInScope(), userController.activate);
router.post("/:userId/deactivate", requireAdmin(), requireTargetUserInScope(), userController.deactivate);

// Hard(soft) delete is SUPER_ADMIN only — an ADMIN can deactivate a
// student but not erase the account.
router.delete("/:userId", requireSuperAdmin(), requireTargetUserInScope(), userController.remove);

module.exports = router;