const prisma = require("../config/db");

/**
 * writeAuditLog
 * Fire-and-forget-safe audit write. Called from service-layer functions
 * after a privileged mutation succeeds. Never throws into the caller's
 * control flow — an audit-write failure should be logged, not turned into
 * a failed request for an action that already committed.
 *
 * @param {object} params
 * @param {{id: string, email: string, role: string}} params.actor
 * @param {string} params.action      e.g. "college.create"
 * @param {string} params.targetType  e.g. "College"
 * @param {string} [params.targetId]
 * @param {object} [params.metadata]  small, non-sensitive context only
 */
async function writeAuditLog({ actor, action, targetType, targetId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actor?.id ?? null,
        actorEmail: actor?.email ?? "unknown",
        actorRole: actor?.role ?? "USER",
        action,
        targetType,
        targetId: targetId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write audit log:", action, targetType, targetId, err.message);
  }
}

module.exports = { writeAuditLog };