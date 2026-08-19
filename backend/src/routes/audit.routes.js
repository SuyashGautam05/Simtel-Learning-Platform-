const express = require("express");
const auditController = require("../controllers/audit.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/role.middleware");

const router = express.Router();

// requireAdmin() lets ADMIN in too — SUPER_ADMIN sees everything, ADMIN
// is scoped to their own college inside audit.service.js#listAuditLogs.
// USER never reaches this route at all.
router.use(requireAuth, requireAdmin());
router.get("/", auditController.list);

module.exports = router;