const { verifyAccessToken } = require("../utils/jwt");
const { ApiError } = require("../utils/apiResponse");
const prisma = require("../config/db");

/**
 * requireAuth
 * Reads the access token from the httpOnly cookie (preferred) or
 * Authorization: Bearer header (fallback for non-browser clients),
 * verifies it, and attaches the authenticated user to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = req.cookies?.accessToken || bearer;

    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = verifyAccessToken(token);

    // Re-check user status on every request so a suspended/deleted user
    // is rejected immediately, not just when their token expires.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, collegeId: true, email: true, name: true, deletedAt: true },
    });

    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      throw new ApiError(401, "Account is not active");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = { requireAuth };