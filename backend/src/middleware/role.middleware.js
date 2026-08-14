const { ApiError } = require("../utils/apiResponse");

/**
 * requireRole(...roles)
 * Generic RBAC gate. Usage: requireRole("SUPER_ADMIN", "ADMIN")
 * Must run after requireAuth.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }
    next();
  };
}

/**
 * requireSameCollegeOrSuperAdmin
 * For ADMIN-scoped routes (e.g. managing students): a College Admin may
 * only act on records within their own college; SUPER_ADMIN bypasses this.
 * Expects the target college id to be resolved onto req.targetCollegeId
 * by an earlier handler/param, or passed explicitly.
 */
function requireSameCollegeOrSuperAdmin(getTargetCollegeId) {
  return (req, res, next) => {
    if (req.user.role === "SUPER_ADMIN") return next();

    if (req.user.role !== "ADMIN") {
      return next(new ApiError(403, "You do not have permission to perform this action"));
    }

    const targetCollegeId = getTargetCollegeId(req);
    if (!targetCollegeId || targetCollegeId !== req.user.collegeId) {
      return next(new ApiError(403, "You can only manage users within your own college"));
    }
    next();
  };
}

module.exports = { requireRole, requireSameCollegeOrSuperAdmin };
