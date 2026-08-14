const prisma = require("../../src/config/db");
const { hashPassword } = require("../../src/utils/password");

const TEST_PASSWORD = "TestPass123";

/**
 * Creates a minimal, isolated fixture set for RBAC testing:
 *   - Two colleges (A, B)
 *   - One SUPER_ADMIN (platform-wide)
 *   - One ADMIN per college
 *   - One USER (student) per college
 * All emails are suffixed with the run timestamp so repeated test runs
 * never collide on the unique email constraint.
 */
async function createFixtures() {
  const suffix = Date.now();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const collegeA = await prisma.college.create({
    data: { name: "Test College A", code: `TCA-${suffix}`, status: "ACTIVE" },
  });
  const collegeB = await prisma.college.create({
    data: { name: "Test College B", code: `TCB-${suffix}`, status: "ACTIVE" },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "Test Super Admin",
      email: `superadmin.${suffix}@rbactest.local`,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: "Test Admin A",
      email: `admina.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });

  const adminB = await prisma.user.create({
    data: {
      name: "Test Admin B",
      email: `adminb.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });

  const studentA = await prisma.user.create({
    data: {
      name: "Test Student A",
      email: `studenta.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });

  const studentB = await prisma.user.create({
    data: {
      name: "Test Student B",
      email: `studentb.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });

  return {
    suffix,
    password: TEST_PASSWORD,
    collegeA,
    collegeB,
    superAdmin,
    adminA,
    adminB,
    studentA,
    studentB,
  };
}

async function cleanupFixtures(fx) {
  const userIds = [fx.superAdmin.id, fx.adminA.id, fx.adminB.id, fx.studentA.id, fx.studentB.id];
  const collegeIds = [fx.collegeA.id, fx.collegeB.id];

  // Also remove anything created *by* the tests during the run (e.g. a
  // student created via POST /api/users, or a college created via POST
  // /api/colleges) so re-running the suite doesn't leak data. Every
  // fixture and every test-created college/user in this suite carries the
  // run's timestamp suffix in its code/email, so matching on that catches
  // records that aren't directly linked to the two seed colleges.
  const suffixTag = String(fx.suffix);

  await prisma.refreshToken.deleteMany({
    where: { user: { email: { contains: suffixTag } } },
  });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.user.deleteMany({
    where: {
      OR: [{ id: { in: userIds } }, { collegeId: { in: collegeIds } }, { email: { contains: suffixTag } }],
    },
  });
  await prisma.college.deleteMany({
    where: { OR: [{ id: { in: collegeIds } }, { code: { contains: suffixTag } }] },
  });
}

module.exports = { createFixtures, cleanupFixtures, TEST_PASSWORD };