const prisma = require("../config/db");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");

async function listColleges() {
  return prisma.college.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

async function getCollege(id) {
  const college = await prisma.college.findUnique({ where: { id } });
  if (!college || college.deletedAt) throw new ApiError(404, "College not found");
  return college;
}

async function createCollege(input, actor) {
  const existing = await prisma.college.findUnique({ where: { code: input.code } });
  if (existing) throw new ApiError(409, "A college with this code already exists");

  const college = await prisma.college.create({ data: input });

  await writeAuditLog({
    actor,
    action: "college.create",
    targetType: "College",
    targetId: college.id,
    metadata: { code: college.code, name: college.name },
  });

  return college;
}

async function updateCollege(id, input, actor) {
  const existing = await getCollege(id);

  const college = await prisma.college.update({ where: { id: existing.id }, data: input });

  await writeAuditLog({
    actor,
    action: "college.update",
    targetType: "College",
    targetId: college.id,
    metadata: { changes: Object.keys(input) },
  });

  return college;
}

// Soft delete only — a college with historical users/keys/licenses is
// never hard-deleted (see DATABASE.md cascading-rules rationale).
async function deleteCollege(id, actor) {
  const existing = await getCollege(id);

  const college = await prisma.college.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), status: "SUSPENDED" },
  });

  await writeAuditLog({
    actor,
    action: "college.delete",
    targetType: "College",
    targetId: college.id,
  });

  return college;
}

module.exports = { listColleges, getCollege, createCollege, updateCollege, deleteCollege };