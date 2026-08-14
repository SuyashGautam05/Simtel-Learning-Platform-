const { ApiError } = require("../utils/apiResponse");
const prisma = require("../config/db");

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

/** Only the platform owner. */
function requireSuperAdmin() {
  return requireRole("SUPER_ADMIN");
}

/** College admin or platform owner (SUPER_ADMIN can act on any college's data). */
function requireAdmin() {
  return requireRole("SUPER_ADMIN", "ADMIN");
}

/** Any authenticated student. Rarely needed on its own (requireAuth already
 * covers "logged in"), but included for symmetry / explicit intent at the
 * route definition. */
function requireUser() {
  return requireRole("SUPER_ADMIN", "ADMIN", "USER");
}

/**
 * requireSameCollegeOrSuperAdmin(getTargetCollegeId)
 * Synchronous variant — use when the target collegeId is already known
 * without a DB lookup (e.g. it's a route param or already on req).
 * SUPER_ADMIN always bypasses. ADMIN must match req.user.collegeId exactly.
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

/**
 * requireTargetUserInScope
 * -------------------------------------------------------------------------
 * The core tenant-isolation guard for user-management routes shaped like
 * /api/users/:userId or /api/users/:userId/... . Loads the target user
 * (once, attaches it to req.targetUser for the handler to reuse) and
 * enforces:
 *   - SUPER_ADMIN: unrestricted.
 *   - ADMIN: target user must belong to the admin's own college, AND must
 *     not be a SUPER_ADMIN or another ADMIN (an admin cannot manage peers
 *     or the platform owner) — closing the "change the ID in the URL"
 *     attack the way IDOR/BOLA vulnerabilities usually work.
 *   - USER: never reaches this guard (routes using it are admin-only).
 * -------------------------------------------------------------------------
 */
function requireTargetUserInScope() {
  return async (req, res, next) => {
    try {
      const targetUserId = req.params.userId || req.params.id;
      if (!targetUserId) {
        return next(new ApiError(400, "Missing target user id"));
      }

      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser || targetUser.deletedAt) {
        return next(new ApiError(404, "User not found"));
      }

      if (req.user.role === "SUPER_ADMIN") {
        req.targetUser = targetUser;
        return next();
      }

      if (req.user.role === "ADMIN") {
        if (targetUser.collegeId !== req.user.collegeId) {
          // Deliberately the same 404 a nonexistent id would produce —
          // confirming "this id exists but isn't yours" via a 403 leaks
          // information about IDs outside the admin's tenant.
          return next(new ApiError(404, "User not found"));
        }
        if (targetUser.role !== "USER") {
          return next(
            new ApiError(403, "College admins can only manage student accounts, not other admins")
          );
        }
        req.targetUser = targetUser;
        return next();
      }

      return next(new ApiError(403, "You do not have permission to perform this action"));
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireOwnResourceOrAdmin(getOwnerUserId)
 * For USER-facing "my own data" routes that also need to allow an
 * ADMIN/SUPER_ADMIN to view the same resource (e.g. progress). A student
 * may only ever access their own record.
 */
function requireOwnResourceOrAdmin(getOwnerUserId) {
  return (req, res, next) => {
    if (req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN") return next();

    const ownerId = getOwnerUserId(req);
    if (ownerId !== req.user.id) {
      return next(new ApiError(403, "You can only access your own data"));
    }
    next();
  };
}

module.exports = {
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireUser,
  requireSameCollegeOrSuperAdmin,
  requireTargetUserInScope,
  requireOwnResourceOrAdmin,
};