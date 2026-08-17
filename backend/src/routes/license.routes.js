const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin } = require("../middleware/role.middleware");
const { listLicenses } = require("../services/license.service");
const { ok } = require("../utils/apiResponse");

const router = express.Router();

router.use(requireAuth, requireSuperAdmin());

router.get("/", async (req, res, next) => {
  try {
    const licenses = await listLicenses(req.query);
    return ok(res, { licenses });
  } catch (err) {
    next(err);
  }
});

module.exports = router;