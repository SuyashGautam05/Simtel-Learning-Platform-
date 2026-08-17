const express = require("express");
const collegeController = require("../controllers/college.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  requireSuperAdmin,
  requireSameCollegeOrSuperAdmin,
} = require("../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

// SUPER_ADMIN only — the full college directory.
router.get("/", requireSuperAdmin(), collegeController.list);
router.post("/", requireSuperAdmin(), collegeController.create);
router.patch("/:id", requireSuperAdmin(), collegeController.update);
router.delete("/:id", requireSuperAdmin(), collegeController.remove);

// SUPER_ADMIN can view any college; ADMIN can view only their own —
// this is the "ADMIN: access only their own college" rule enforced by
// comparing the :id param against req.user.collegeId, not by trusting
// the client to only ever request their own id.
router.get(
  "/:id",
  requireSameCollegeOrSuperAdmin((req) => req.params.id),
  collegeController.getOne
);

// College Admin dashboard data — same tenant gate as GET /:id above.
router.get(
  "/:id/stats",
  requireSameCollegeOrSuperAdmin((req) => req.params.id),
  collegeController.stats
);
router.get(
  "/:id/recent-activity",
  requireSameCollegeOrSuperAdmin((req) => req.params.id),
  collegeController.recentActivity
);

module.exports = router;