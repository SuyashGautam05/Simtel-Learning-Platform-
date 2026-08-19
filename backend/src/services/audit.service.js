const prisma = require("../config/db");
const { ApiError } = require("../utils/apiResponse");

/**
 * listAuditLogs
 * -----------------------------------------------------------------------
 * SUPER_ADMIN: every log, optionally filtered by action/targetType/actor.
 * ADMIN: "relevant activity for their college" — every log where either
 *   - the ACTOR is someone in their college (covers a student's own
 *     LOGIN/LOGOUT/FAILED_LOGIN/PASSWORD_CHANGED/PRODUCT_KEY_ACTIVATED/
 *     PRODUCT_ACCESS_GRANTED events, and the admin's own actions), or
 *   - the TARGET is a User in their college (covers being acted on by
 *     someone else — e.g. a SUPER_ADMIN editing one of their students,
 *     or the admin's own USER_CREATED/USER_DEACTIVATED/PASSWORD_CHANGED
 *     actions on a student)
 * This is computed from real college membership (`collegeId` on every
 * user in that college, admin included), not from a client-supplied
 * filter — an ADMIN cannot pass a query param to see another college's
 * activity because there is no collegeId-shaped input accepted from an
 * ADMIN caller at all; scope is derived entirely from `requester`.
 * USER never reaches this function — blocked at the route layer.
 * -----------------------------------------------------------------------
 */
async function listAuditLogs(requester, { action, targetType, actorUserId, page = 1, pageSize = 50 }) {
  const where = {
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
  };

  if (requester.role === "SUPER_ADMIN") {
    if (actorUserId) where.actorUserId = actorUserId;
  } else if (requester.role === "ADMIN") {
    const collegeUsers = await prisma.user.findMany({
      where: { collegeId: requester.collegeId },
      select: { id: true },
    });
    const collegeUserIds = collegeUsers.map((u) => u.id);

    where.OR = [
      { actorUserId: { in: collegeUserIds } },
      { targetType: "User", targetId: { in: collegeUserIds } },
    ];
    // actorUserId filter, if supplied, narrows further within the
    // already-scoped set rather than escaping it.
    if (actorUserId && collegeUserIds.includes(actorUserId)) {
      where.OR = undefined;
      where.actorUserId = actorUserId;
    }
  } else {
    // Defense in depth — the route already blocks USER from reaching here.
    throw new ApiError(403, "You do not have permission to view audit logs");
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pageSize };
}

module.exports = { listAuditLogs };