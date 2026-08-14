const express = require("express");
const auditController = require("../controllers/audit.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin } = require("../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth, requireSuperAdmin());
router.get("/", auditController.list);

module.exports = router;