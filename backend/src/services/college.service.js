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

/**
 * getCollegeStats — the 6 College Admin dashboard metrics, scoped to one
 * college. The caller (route) is responsible for ensuring the requester
 * is allowed to see this collegeId (requireSameCollegeOrSuperAdmin) —
 * this function itself takes the id as given and doesn't re-check role,
 * matching the pattern already used for GET /colleges/:id.
 */
async function getCollegeStats(collegeId) {
  await getCollege(collegeId); // 404s if it doesn't exist / is deleted
  const now = new Date();

  const [totalStudents, activeStudents, activeLicenses, assignedModuleRows] = await Promise.all([
    prisma.user.count({ where: { collegeId, role: "USER", deletedAt: null } }),
    prisma.user.count({ where: { collegeId, role: "USER", status: "ACTIVE", deletedAt: null } }),
    prisma.collegeProductLicense.count({ where: { collegeId, status: "ACTIVE" } }),
    // Distinct modules actually in use by this college's students right
    // now — a real, derivable number, unlike per-lesson progress.
    prisma.userProductAccess.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        user: { collegeId, role: "USER" },
      },
      select: { productId: true },
      distinct: ["productId"],
    }),
  ]);

  return {
    totalStudents,
    activeStudents,
    assignedModules: assignedModuleRows.length,
    activeLicenses,
    // No per-lesson Progress model exists yet — reporting null here
    // (frontend shows "Not yet tracked") is more honest than fabricating
    // a percentage from data that doesn't exist.
    averageProgress: null,
  };
}

/**
 * getCollegeRecentActivity — genuine, real activity: module activations
 * by this college's students, most recent first. Not a fabricated feed.
 */
async function getCollegeRecentActivity(collegeId, limit = 10) {
  await getCollege(collegeId);

  const activity = await prisma.userProductAccess.findMany({
    where: { user: { collegeId, role: "USER" } },
    include: { product: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { activatedAt: "desc" },
    take: limit,
  });

  return activity.map((a) => ({
    id: a.id,
    student: { id: a.user.id, name: a.user.name, email: a.user.email },
    product: { id: a.product.id, name: a.product.name, code: a.product.code },
    status: a.status,
    activatedAt: a.activatedAt,
  }));
}

module.exports = {
  listColleges,
  getCollege,
  createCollege,
  updateCollege,
  deleteCollege,
  getCollegeStats,
  getCollegeRecentActivity,
};