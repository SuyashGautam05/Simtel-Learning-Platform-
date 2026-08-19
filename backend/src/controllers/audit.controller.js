const { z } = require("zod");
const auditService = require("../services/audit.service");
const { ok } = require("../utils/apiResponse");

const querySchema = z.object({
  action: z.string().optional(),
  targetType: z.string().optional(),
  actorUserId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

async function list(req, res, next) {
  try {
    const filters = querySchema.parse(req.query);
    const result = await auditService.listAuditLogs(req.user, filters);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };