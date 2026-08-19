const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// IP-based rate limiting (first line of defense). Combined with the
// per-account lockout in auth.service.js (loginAttempts util) for
// brute-force protection that survives an attacker rotating IPs.
const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many accounts created from this network. Try again later." },
});

// SECURITY: /refresh and /change-password previously had no rate limiting
// at all — an attacker with a stolen/guessed refresh-token cookie could
// hammer /refresh unthrottled, and a logged-in attacker (or someone who
// has hijacked a session) could brute-force the current-password check on
// /change-password with no backoff. Both get a generous but real ceiling;
// legitimate usage of either is infrequent enough that this is invisible
// to real users.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many refresh attempts. Try again later." },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many password change attempts. Try again later." },
});

router.post("/register", registerLimiter, authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.post("/change-password", requireAuth, changePasswordLimiter, authController.changePassword);

module.exports = router;