const prisma = require("../../src/config/db");
const { hashPassword } = require("../../src/utils/password");

const TEST_PASSWORD = "TestPass123";

async function createCollegeAdminFixtures() {
  const suffix = Date.now();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const collegeA = await prisma.college.create({
    data: { name: "CA Test College A", code: `CATC-A-${suffix}`, status: "ACTIVE" },
  });
  const collegeB = await prisma.college.create({
    data: { name: "CA Test College B", code: `CATC-B-${suffix}`, status: "ACTIVE" },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "CA Super Admin",
      email: `ca-superadmin.${suffix}@rbactest.local`,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const adminA = await prisma.user.create({
    data: {
      name: "CA Admin A",
      email: `ca-admina.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });

  const adminB = await prisma.user.create({
    data: {
      name: "CA Admin B",
      email: `ca-adminb.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });

  const studentA = await prisma.user.create({
    data: {
      name: "CA Student A",
      email: `ca-studenta.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });

  const studentB = await prisma.user.create({
    data: {
      name: "CA Student B",
      email: `ca-studentb.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });

  const product = await prisma.product.create({
    data: { name: `CA Test PLC ${suffix}`, code: `CAPLC${suffix % 100000}`, status: "ACTIVE" },
  });

  // Give studentA active access, for a real "recent activity" row.
  await prisma.userProductAccess.create({
    data: { userId: studentA.id, productId: product.id, status: "ACTIVE" },
  });

  // A license for collegeA only.
  await prisma.collegeProductLicense.create({
    data: { collegeId: collegeA.id, productId: product.id, totalSeats: 10, usedSeats: 1, status: "ACTIVE" },
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
    product,
  };
}

async function cleanupCollegeAdminFixtures(fx) {
  const userIds = [fx.superAdmin.id, fx.adminA.id, fx.adminB.id, fx.studentA.id, fx.studentB.id];
  const collegeIds = [fx.collegeA.id, fx.collegeB.id];
  const suffixTag = String(fx.suffix);

  await prisma.userProductAccess.deleteMany({ where: { productId: fx.product.id } });
  await prisma.collegeProductLicense.deleteMany({ where: { collegeId: { in: collegeIds } } });
  await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: suffixTag } } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.user.deleteMany({
    where: {
      OR: [{ id: { in: userIds } }, { collegeId: { in: collegeIds } }, { email: { contains: suffixTag } }],
    },
  });
  await prisma.product.deleteMany({ where: { id: fx.product.id } });
  await prisma.college.deleteMany({ where: { id: { in: collegeIds } } });
}

module.exports = { createCollegeAdminFixtures, cleanupCollegeAdminFixtures, TEST_PASSWORD };