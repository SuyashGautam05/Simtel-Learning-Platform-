const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");
const { listLicenses } = require("../services/license.service");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

// requireAdmin() lets ADMIN in too now — tenant scoping to their own
// college happens inside listLicenses(requester, filters), not here.
// SUPER_ADMIN still sees everything.
router.use(requireAuth, requireAdmin());

router.get("/", async (req, res, next) => {
  try {
    const licenses = await listLicenses(req.user, req.query);
    return ok(res, { licenses });
  } catch (err) {
    next(err);
  }
});

module.exports = router;