const prisma = require("../config/db");

/**
 * getRequestContext(req)
 * Pulls the two pieces of request metadata the audit log cares about,
 * from one place, so every call site extracts them the same way. `req.ip`
 * respects Express's `trust proxy` setting if configured; no attempt is
 * made here to parse X-Forwarded-For manually.
 */
function getRequestContext(req) {
  if (!req) return { ipAddress: null, userAgent: null };
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers?.["user-agent"] ?? null,
  };
}

/**
 * writeAuditLog
 * Fire-and-forget-safe audit write. Called from service-layer functions
 * after a privileged mutation succeeds (or, for FAILED_LOGIN, after a
 * login attempt fails). Never throws into the caller's control flow — an
 * audit-write failure should be logged, not turned into a failed request
 * for an action that already committed.
 *
 * SECURITY: `metadata` must never contain a password, password hash, raw
 * token, or raw product key — every call site in this codebase passes
 * only identifiers and non-secret descriptive fields (email, role,
 * productCode, counts, timestamps). Review any new call site against
 * this rule before merging.
 *
 * @param {object} params
 * @param {{id?: string, email: string, role: string}|null} params.actor
 *   Pass null explicitly for a pre-authentication event (e.g. a failed
 *   login against an email that doesn't exist) — actorUserId will be
 *   null and actorEmail/actorRole record what's knowable about the
 *   attempt without inventing a real account reference.
 * @param {string} params.action      one of AUDIT_ACTIONS, see
 *   src/constants/auditActions.js
 * @param {string} params.targetType  e.g. "User", "Product", "ProductKey"
 * @param {string} [params.targetId]
 * @param {object} [params.metadata]  small, non-sensitive context only
 * @param {import('express').Request} [params.req]
 *   If provided, IP + user agent are captured from it automatically.
 * @param {string} [params.ipAddress] Explicit override, takes precedence
 *   over `req` (useful when the request object isn't in scope but the
 *   caller already extracted these values).
 * @param {string} [params.userAgent]
 */
async function writeAuditLog({
  actor,
  action,
  targetType,
  targetId,
  metadata,
  req,
  ipAddress,
  userAgent,
}) {
  try {
    const context = getRequestContext(req);

    await prisma.auditLog.create({
      data: {
        actorUserId: actor?.id ?? null,
        actorEmail: actor?.email ?? "unknown",
        actorRole: actor?.role ?? "USER",
        action,
        targetType,
        targetId: targetId ?? null,
        metadata: metadata ?? undefined,
        ipAddress: ipAddress ?? context.ipAddress,
        userAgent: userAgent ?? context.userAgent,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write audit log:", action, targetType, targetId, err.message);
  }
}

module.exports = { writeAuditLog, getRequestContext };