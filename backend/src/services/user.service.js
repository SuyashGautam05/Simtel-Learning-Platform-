const crypto = require("crypto");
const prisma = require("../config/db");
const { hashPassword } = require("../utils/password");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");
const { AUDIT_ACTIONS } = require("../constants/auditActions");

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

/**
 * listUsers
 * SUPER_ADMIN: sees everyone, optionally filtered by role/collegeId/status.
 * ADMIN: hard-scoped to their own college regardless of what filters they
 * pass — the collegeId query param is IGNORED for an ADMIN caller so there
 * is no way to see another college's roster by editing the querystring.
 */
async function listUsers(requester, filters) {
  const where = { deletedAt: null };

  if (requester.role === "SUPER_ADMIN") {
    if (filters.role) where.role = filters.role;
    if (filters.collegeId) where.collegeId = filters.collegeId;
    if (filters.status) where.status = filters.status;
  } else if (requester.role === "ADMIN") {
    where.collegeId = requester.collegeId; // never trust filters.collegeId here
    where.role = "USER"; // an admin's roster is students, not peer admins
    if (filters.status) where.status = filters.status;
  } else {
    throw new ApiError(403, "You do not have permission to perform this action");
  }

  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
  return users.map(sanitizeUser);
}

/**
 * createUser
 * SUPER_ADMIN: may create ADMIN or USER, for any college.
 * ADMIN: may only create USER accounts, always inside their own college —
 * any collegeId/role they attempt to pass is overridden, not merely
 * validated, so a crafted request body can't escalate scope.
 */
async function createUser(requester, input, req) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ApiError(409, "A user with this email already exists");

  let role = input.role || "USER";
  let collegeId = input.collegeId ?? null;

  if (requester.role === "ADMIN") {
    // An ADMIN's request can never produce anything but a USER, in their
    // own college — silently overridden, not just validated, so a crafted
    // request body can't escalate scope.
    role = "USER";
    collegeId = requester.collegeId;
  } else if (requester.role === "SUPER_ADMIN") {
    // SUPER_ADMIN accounts are never created through this endpoint,
    // even by an existing SUPER_ADMIN — that tier is provisioned only via
    // the seed script / direct DB access. A crafted "role": "SUPER_ADMIN"
    // is downgraded to USER rather than rejected outright, so this
    // behaves the same way an ADMIN's escalation attempt does.
    if (role === "SUPER_ADMIN") {
      role = "USER";
    }
    if (role === "ADMIN" && !collegeId) {
      throw new ApiError(400, "collegeId is required when creating an ADMIN account");
    }
  } else {
    throw new ApiError(403, "You do not have permission to perform this action");
  }

  if (collegeId) {
    const college = await prisma.college.findUnique({ where: { id: collegeId } });
    if (!college || college.deletedAt) throw new ApiError(400, "Invalid collegeId");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role, status: "ACTIVE", collegeId },
  });

  await writeAuditLog({
    actor: requester,
    action: role === "ADMIN" ? AUDIT_ACTIONS.ADMIN_CREATED : AUDIT_ACTIONS.USER_CREATED,
    targetType: "User",
    targetId: user.id,
    metadata: { email: user.email, role: user.role, collegeId: user.collegeId },
    req,
  });

  return sanitizeUser(user);
}

/**
 * updateUser
 * Ownership/tenant enforcement already happened in requireTargetUserInScope
 * (req.targetUser). This function trusts that gate and just applies the
 * permitted field changes.
 */
async function updateUser(requester, targetUser, input, req) {
  const user = await prisma.user.update({
    where: { id: targetUser.id },
    data: { name: input.name ?? targetUser.name },
  });

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.USER_UPDATED,
    targetType: "User",
    targetId: user.id,
    metadata: { changes: Object.keys(input) },
    req,
  });

  return sanitizeUser(user);
}

async function setUserStatus(requester, targetUser, status, req) {
  // Extra guard even though requireTargetUserInScope already blocks an
  // ADMIN from targeting non-USER accounts — defense in depth.
  if (requester.role === "ADMIN" && targetUser.role !== "USER") {
    throw new ApiError(403, "College admins can only manage student accounts");
  }
  // SUPER_ADMIN accounts are never deactivated through this endpoint —
  // not by another admin, and not even by themselves — to avoid an
  // accidental platform lockout. Use direct DB access for that.
  if (targetUser.role === "SUPER_ADMIN") {
    throw new ApiError(403, "SUPER_ADMIN accounts cannot be deactivated through this endpoint");
  }

  const user = await prisma.user.update({
    where: { id: targetUser.id },
    data: { status },
  });

  await writeAuditLog({
    actor: requester,
    action: status === "ACTIVE" ? AUDIT_ACTIONS.USER_ACTIVATED : AUDIT_ACTIONS.USER_DEACTIVATED,
    targetType: "User",
    targetId: user.id,
    req,
  });

  return sanitizeUser(user);
}

async function softDeleteUser(requester, targetUser, req) {
  if (targetUser.role === "SUPER_ADMIN") {
    throw new ApiError(403, "SUPER_ADMIN accounts cannot be deleted through this endpoint");
  }

  const user = await prisma.user.update({
    where: { id: targetUser.id },
    data: { deletedAt: new Date(), status: "SUSPENDED" },
  });

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.USER_DELETED,
    targetType: "User",
    targetId: user.id,
    req,
  });

  return sanitizeUser(user);
}

async function updateOwnProfile(requester, input) {
  const user = await prisma.user.update({
    where: { id: requester.id },
    data: { name: input.name ?? undefined },
  });
  return sanitizeUser(user);
}

/**
 * generateTempPassword
 * Cryptographically random, not a predictable pattern — built by
 * construction to satisfy the same complexity rule real user passwords
 * must meet (one lowercase, one uppercase, one digit, sufficient length),
 * so the student can log in with it immediately without hitting a
 * validation error on their own next password change.
 */
function generateTempPassword() {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;

  const pick = (charset) => charset[crypto.randomInt(0, charset.length)];
  const required = [pick(upper), pick(lower), pick(digits)];
  const rest = Array.from({ length: 9 }, () => pick(all));

  // Shuffle so the guaranteed characters aren't always in the same
  // position (Fisher-Yates, using crypto.randomInt).
  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * resetPassword — the "secure workflow" for an admin resetting a
 * student's password:
 *   1. Ownership/tenant scope already enforced by requireTargetUserInScope
 *      before this ever runs (an ADMIN can only reach their own college's
 *      students here).
 *   2. A cryptographically random temporary password is generated —
 *      never a predictable value, never chosen by the admin.
 *   3. It's hashed with the same bcrypt path as any other password;
 *      the raw value exists only in memory for this one response.
 *   4. Every existing session for that account is revoked, so a
 *      possibly-compromised session (the reason for the reset, often)
 *      is force-logged-out immediately.
 *   5. The action is audit-logged (without the password itself).
 * The raw temporary password is returned exactly once, the same
 * one-time-display pattern used for product keys — the admin is
 * responsible for relaying it to the student out of band.
 */
async function resetPassword(requester, targetUser, req) {
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: targetUser.id }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: targetUser.id, revoked: false },
      data: { revoked: true },
    }),
  ]);

  // Never log the temp password itself — only that a reset happened, by
  // whom, and for whom.
  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    targetType: "User",
    targetId: targetUser.id,
    metadata: { selfService: false, resetBy: requester.id },
    req,
  });

  return { tempPassword };
}

/**
 * getUserProductAccessList — a student's module authorizations, for the
 * "view student progress" admin capability. No per-lesson Progress model
 * exists yet, so this returns the honest, real thing that does exist:
 * which modules the student currently has access to, and when they
 * activated/expire.
 */
async function getUserProductAccessList(targetUser) {
  const access = await prisma.userProductAccess.findMany({
    where: { userId: targetUser.id },
    include: { product: true },
    orderBy: { activatedAt: "desc" },
  });

  return access.map((a) => ({
    id: a.id,
    product: { id: a.product.id, name: a.product.name, code: a.product.code },
    status: a.status,
    activatedAt: a.activatedAt,
    expiresAt: a.expiresAt,
  }));
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
  softDeleteUser,
  updateOwnProfile,
  resetPassword,
  getUserProductAccessList,
  sanitizeUser,
};