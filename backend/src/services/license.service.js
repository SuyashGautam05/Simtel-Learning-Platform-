const prisma = require("../config/db");

/**
 * Lists CollegeProductLicense rows (the bulk/seat-pool licensing model)
 * with college + product context and a computed usage percentage — the
 * "VIEW LICENSE USAGE" capability. Read-only: creating/editing a license
 * isn't part of this step's scope, only visibility into what's already
 * provisioned.
 */
async function listLicenses(filters = {}) {
  const where = {};
  if (filters.collegeId) where.collegeId = filters.collegeId;
  if (filters.productId) where.productId = filters.productId;
  if (filters.status) where.status = filters.status;

  const licenses = await prisma.collegeProductLicense.findMany({
    where,
    include: { college: true, product: true },
    orderBy: { createdAt: "desc" },
  });

  return licenses.map((l) => ({
    id: l.id,
    college: { id: l.college.id, name: l.college.name, code: l.college.code },
    product: { id: l.product.id, name: l.product.name, code: l.product.code },
    totalSeats: l.totalSeats,
    usedSeats: l.usedSeats,
    remainingSeats: Math.max(0, l.totalSeats - l.usedSeats),
    usagePercent: l.totalSeats > 0 ? Math.round((l.usedSeats / l.totalSeats) * 100) : 0,
    status: l.status,
    startsAt: l.startsAt,
    expiresAt: l.expiresAt,
    createdAt: l.createdAt,
  }));
}

module.exports = { listLicenses };