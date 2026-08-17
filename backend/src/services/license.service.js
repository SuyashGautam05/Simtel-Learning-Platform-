const prisma = require("../config/db");

/**
 * Lists CollegeProductLicense rows (the bulk/seat-pool licensing model)
 * with college + product context and a computed usage percentage — the
 * "VIEW LICENSE USAGE" capability. Read-only: creating/editing a license
 * isn't part of this step's scope, only visibility into what's already
 * provisioned.
 *
 * SUPER_ADMIN: any college, optionally filtered.
 * ADMIN: hard-scoped to their own college — any collegeId in `filters`
 * is IGNORED for an ADMIN caller, same pattern as user.service.js#listUsers.
 */
async function listLicenses(requester, filters = {}) {
  const where = {};

  if (requester.role === "SUPER_ADMIN") {
    if (filters.collegeId) where.collegeId = filters.collegeId;
  } else if (requester.role === "ADMIN") {
    where.collegeId = requester.collegeId; // never trust filters.collegeId here
  } else {
    where.collegeId = "__none__"; // defense in depth; route already blocks this
  }

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