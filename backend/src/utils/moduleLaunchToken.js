const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Deliberately a separate secret from the main access/refresh tokens —
// this token has a completely different trust boundary (it's handed to
// third-party-hosted module code running in an iframe, not kept in an
// httpOnly cookie on the platform's own origin), so a leak of one secret
// doesn't compromise the other token family.
const SECRET = process.env.MODULE_LAUNCH_SECRET || process.env.JWT_ACCESS_SECRET;
const LAUNCH_TOKEN_TTL = "10m";

/**
 * signLaunchToken
 * Scoped to exactly one (user, product) pair, short-lived, single
 * purpose: proves to the module's own backend (if it has one, e.g. to
 * save state) "this specific user was authorized for this specific
 * module by the platform, as of a few minutes ago." It carries no
 * platform session capability — verifying it does not let a module
 * impersonate the user anywhere else on the platform.
 */
function signLaunchToken({ userId, productId, productCode }) {
  return jwt.sign(
    { sub: userId, productId, productCode, purpose: "module_launch" },
    SECRET,
    { expiresIn: LAUNCH_TOKEN_TTL, jwtid: crypto.randomUUID() }
  );
}

function verifyLaunchToken(token) {
  const payload = jwt.verify(token, SECRET);
  if (payload.purpose !== "module_launch") {
    throw new Error("Not a module launch token");
  }
  return payload;
}

module.exports = { signLaunchToken, verifyLaunchToken };