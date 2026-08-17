const prisma = require("../config/db");

/**
 * All eight Super Admin dashboard metrics, computed in parallel. Kept as
 * its own service (rather than inline in the route) so the numbers are
 * defined once and can be reused anywhere else that needs them.
 */
async function getPlatformStats() {
  const now = new Date();

  const [
    totalColleges,
    totalAdmins,
    totalStudents,
    totalProducts,
    totalProductKeys,
    activeLicenses,
    expiredLicenses,
    activeUsers,
  ] = await Promise.all([
    prisma.college.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "ADMIN", deletedAt: null } }),
    prisma.user.count({ where: { role: "USER", deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.productKey.count(),
    // "Active license" = a currently-valid grant: status ACTIVE and not
    // past its own expiresAt (a row can still say ACTIVE if a background
    // sweep hasn't flipped it yet — see activation.service.js).
    prisma.userProductAccess.count({
      where: {
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    }),
    // "Expired license" = explicitly EXPIRED, or still marked ACTIVE but
    // past its expiresAt (caught here even before a sweep updates it).
    prisma.userProductAccess.count({
      where: {
        OR: [{ status: "EXPIRED" }, { status: "ACTIVE", expiresAt: { lte: now } }],
      },
    }),
    prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
  ]);

  return {
    totalColleges,
    totalAdmins,
    totalStudents,
    totalProducts,
    totalProductKeys,
    activeLicenses,
    expiredLicenses,
    activeUsers,
  };
}

module.exports = { getPlatformStats };