const prisma = require("../../src/config/db");
const { hashPassword } = require("../../src/utils/password");

const TEST_PASSWORD = "TestPass123";

async function createSecurityAuditFixtures() {
  const suffix = Date.now();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const collegeA = await prisma.college.create({
    data: { name: "SecAudit College A", code: `SEC-A-${suffix}`, status: "ACTIVE" },
  });
  const collegeB = await prisma.college.create({
    data: { name: "SecAudit College B", code: `SEC-B-${suffix}`, status: "ACTIVE" },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "SecAudit Super Admin",
      email: `sec-superadmin.${suffix}@rbactest.local`,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
  const adminA = await prisma.user.create({
    data: {
      name: "SecAudit Admin A",
      email: `sec-admina.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });
  const adminB = await prisma.user.create({
    data: {
      name: "SecAudit Admin B",
      email: `sec-adminb.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });
  const studentA = await prisma.user.create({
    data: {
      name: "SecAudit Student A",
      email: `sec-studenta.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });
  const studentA2 = await prisma.user.create({
    data: {
      name: "SecAudit Student A2",
      email: `sec-studenta2.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });
  const studentB = await prisma.user.create({
    data: {
      name: "SecAudit Student B",
      email: `sec-studentb.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });

  const plcProduct = await prisma.product.create({
    data: { name: `SecAudit PLC ${suffix}`, code: `SPLC${suffix % 100000}`, status: "ACTIVE" },
  });
  const otherProduct = await prisma.product.create({
    data: { name: `SecAudit Other ${suffix}`, code: `SOTH${suffix % 100000}`, status: "ACTIVE" },
  });

  // studentA2 has an EXPIRED PLC access; studentB has a REVOKED PLC access
  // — used for the "expired license" / "revoked license" attack checks.
  await prisma.userProductAccess.create({
    data: {
      userId: studentA2.id,
      productId: plcProduct.id,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  await prisma.userProductAccess.create({
    data: { userId: studentB.id, productId: plcProduct.id, status: "REVOKED" },
  });

  return {
    suffix,
    password: TEST_PASSWORD,
    collegeA,
    collegeB,
    superAdmin,
    adminA,
    adminB,
    studentA, // no PLC access at all — the primary "unauthorized student" actor
    studentA2, // expired PLC access
    studentB, // revoked PLC access, different college
    plcProduct,
    otherProduct,
  };
}

async function cleanupSecurityAuditFixtures(fx) {
  const userIds = [
    fx.superAdmin.id,
    fx.adminA.id,
    fx.adminB.id,
    fx.studentA.id,
    fx.studentA2.id,
    fx.studentB.id,
  ];
  const collegeIds = [fx.collegeA.id, fx.collegeB.id];
  const productIds = [fx.plcProduct.id, fx.otherProduct.id];
  const suffixTag = String(fx.suffix);

  await prisma.userProductAccess.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.productKey.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.moduleSimulationState.deleteMany({ where: { productId: { in: productIds } } }).catch(() => null);
  await prisma.auditLog.deleteMany({
    where: { OR: [{ actorUserId: { in: userIds } }, { actorEmail: { contains: suffixTag } }] },
  });
  await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: suffixTag } } } });
  await prisma.user.deleteMany({
    where: { OR: [{ id: { in: userIds } }, { collegeId: { in: collegeIds } }, { email: { contains: suffixTag } }] },
  });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.college.deleteMany({ where: { id: { in: collegeIds } } });
}

module.exports = { createSecurityAuditFixtures, cleanupSecurityAuditFixtures, TEST_PASSWORD };