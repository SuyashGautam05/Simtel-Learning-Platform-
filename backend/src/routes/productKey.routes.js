const express = require("express");
const rateLimit = require("express-rate-limit");
const productKeyController = require("../controllers/productKey.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSuperAdmin } = require("../middleware/role.middleware");

const router = express.Router();

router.use(requireAuth);

// Activation is functionally a credential check (a stolen/guessed key is
// as good as stolen credentials), so it gets the same IP-based
// rate-limiting treatment as login — on top of the key's own ~60 bits of
// entropy, which already makes brute-forcing impractical, but defense in
// depth costs nothing here.
const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many activation attempts. Try again later." },
});

router.post("/activate", activateLimiter, productKeyController.activate);

// Everything below is SUPER_ADMIN-only key management — enforced here on
// the backend, not left to the frontend to hide a button.
router.post("/generate", requireSuperAdmin(), productKeyController.generate);
router.get("/export", requireSuperAdmin(), productKeyController.exportCsv);
router.get("/", requireSuperAdmin(), productKeyController.list);
router.get("/:id", requireSuperAdmin(), productKeyController.getOne);
router.post("/:id/revoke", requireSuperAdmin(), productKeyController.revoke);
router.post("/:id/reactivate", requireSuperAdmin(), productKeyController.reactivate);

module.exports = router;