const prisma = require("../config/db");
const { hashPassword } = require("../utils/password");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");

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
async function createUser(requester, input) {
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
    action: role === "ADMIN" ? "admin.create" : "user.create",
    targetType: "User",
    targetId: user.id,
    metadata: { email: user.email, role: user.role, collegeId: user.collegeId },
  });

  return sanitizeUser(user);
}

/**
 * updateUser
 * Ownership/tenant enforcement already happened in requireTargetUserInScope
 * (req.targetUser). This function trusts that gate and just applies the
 * permitted field changes.
 */
async function updateUser(requester, targetUser, input) {
  const user = await prisma.user.update({
    where: { id: targetUser.id },
    data: { name: input.name ?? targetUser.name },
  });

  await writeAuditLog({
    actor: requester,
    action: "user.update",
    targetType: "User",
    targetId: user.id,
    metadata: { changes: Object.keys(input) },
  });

  return sanitizeUser(user);
}

async function setUserStatus(requester, targetUser, status) {
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
    action: status === "ACTIVE" ? "user.activate" : "user.deactivate",
    targetType: "User",
    targetId: user.id,
  });

  return sanitizeUser(user);
}

async function softDeleteUser(requester, targetUser) {
  if (targetUser.role === "SUPER_ADMIN") {
    throw new ApiError(403, "SUPER_ADMIN accounts cannot be deleted through this endpoint");
  }

  const user = await prisma.user.update({
    where: { id: targetUser.id },
    data: { deletedAt: new Date(), status: "SUSPENDED" },
  });

  await writeAuditLog({
    actor: requester,
    action: "user.delete",
    targetType: "User",
    targetId: user.id,
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

module.exports = {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
  softDeleteUser,
  updateOwnProfile,
  sanitizeUser,
};