const prisma = require("../../src/config/db");
const { hashPassword } = require("../../src/utils/password");

const TEST_PASSWORD = "TestPass123";

async function createModuleAccessFixtures() {
  const suffix = Date.now();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const college = await prisma.college.create({
    data: { name: "MA Test College", code: `MATC-${suffix}`, status: "ACTIVE" },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "MA Super Admin",
      email: `ma-superadmin.${suffix}@rbactest.local`,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "MA Admin",
      email: `ma-admin.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  // Has a valid, active, non-expired PLC license.
  const authorizedStudent = await prisma.user.create({
    data: {
      name: "MA Authorized Student",
      email: `ma-authorized.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  // Logged in, but never authorized for PLC or Electrical.
  const unauthorizedStudent = await prisma.user.create({
    data: {
      name: "MA Unauthorized Student",
      email: `ma-unauthorized.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  // Had access, but it expired.
  const expiredStudent = await prisma.user.create({
    data: {
      name: "MA Expired Student",
      email: `ma-expired.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  // Had access, but it was revoked.
  const revokedStudent = await prisma.user.create({
    data: {
      name: "MA Revoked Student",
      email: `ma-revoked.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  const plcProduct = await prisma.product.create({
    data: { name: `MA Test PLC ${suffix}`, code: `MAPLC${suffix % 100000}`, status: "ACTIVE" },
  });
  const electricalProduct = await prisma.product.create({
    data: { name: `MA Test Electrical ${suffix}`, code: `MAE${suffix % 100000}`, status: "ACTIVE" },
  });
  const draftProduct = await prisma.product.create({
    data: { name: `MA Test Draft ${suffix}`, code: `MADR${suffix % 100000}`, status: "DRAFT" },
  });

  await prisma.userProductAccess.create({
    data: { userId: authorizedStudent.id, productId: plcProduct.id, status: "ACTIVE" },
  });
  await prisma.userProductAccess.create({
    data: {
      userId: expiredStudent.id,
      productId: plcProduct.id,
      status: "ACTIVE",
      expiresAt: new Date(Date.now() - 60_000),
    },
  });
  await prisma.userProductAccess.create({
    data: { userId: revokedStudent.id, productId: plcProduct.id, status: "REVOKED" },
  });

  return {
    suffix,
    password: TEST_PASSWORD,
    college,
    superAdmin,
    admin,
    authorizedStudent,
    unauthorizedStudent,
    expiredStudent,
    revokedStudent,
    plcProduct,
    electricalProduct,
    draftProduct,
  };
}

async function cleanupModuleAccessFixtures(fx) {
  const userIds = [
    fx.superAdmin.id,
    fx.admin.id,
    fx.authorizedStudent.id,
    fx.unauthorizedStudent.id,
    fx.expiredStudent.id,
    fx.revokedStudent.id,
  ];
  const productIds = [fx.plcProduct.id, fx.electricalProduct.id, fx.draftProduct.id];

  await prisma.userProductAccess.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.productKey.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.college.deleteMany({ where: { id: fx.college.id } });
}

module.exports = { createModuleAccessFixtures, cleanupModuleAccessFixtures, TEST_PASSWORD };