const prisma = require("../config/db");

async function listAuditLogs({ action, targetType, actorUserId, page = 1, pageSize = 50 }) {
  const where = {
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(actorUserId ? { actorUserId } : {}),
  };

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