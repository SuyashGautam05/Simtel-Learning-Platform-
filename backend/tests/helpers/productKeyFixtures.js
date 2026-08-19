const prisma = require("../../src/config/db");
const { hashPassword } = require("../../src/utils/password");
const { generateProductKey, hashProductKey, lastFour } = require("../../src/utils/productKeyCrypto");

const TEST_PASSWORD = "TestPass123";

async function createProductKeyFixtures() {
  const suffix = Date.now();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const college = await prisma.college.create({
    data: { name: "PK Test College", code: `PKTC-${suffix}`, status: "ACTIVE" },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "PK Super Admin",
      email: `pk-superadmin.${suffix}@rbactest.local`,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "PK Admin",
      email: `pk-admin.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  const student = await prisma.user.create({
    data: {
      name: "PK Student",
      email: `pk-student.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  // A second student, kept untouched by any other test, reserved for the
  // "cannot manually override productId" check — using the already-active
  // `student` there would hit the idempotent-resubmit path instead of
  // proving the override itself is ignored.
  const student2 = await prisma.user.create({
    data: {
      name: "PK Student 2",
      email: `pk-student2.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: college.id,
    },
  });

  const plcProduct = await prisma.product.create({
    data: { name: `PK Test PLC ${suffix}`, code: `PKPLC${suffix % 100000}`, status: "ACTIVE" },
  });
  const elecProduct = await prisma.product.create({
    data: { name: `PK Test Electrical ${suffix}`, code: `PKE${suffix % 100000}`, status: "ACTIVE" },
  });

  async function makeKey(product, overrides = {}) {
    const rawKey = generateProductKey(product.code);
    const key = await prisma.productKey.create({
      data: {
        keyHash: hashProductKey(rawKey),
        keyLastFour: lastFour(rawKey),
        productId: product.id,
        collegeId: college.id,
        generatedByUserId: superAdmin.id,
        maxActivations: 1,
        activationsCount: 0,
        status: "UNUSED",
        ...overrides,
      },
    });
    return { rawKey, key };
  }

  const validPlcKey = await makeKey(plcProduct);
  const validElecKey = await makeKey(elecProduct);
  const expiredPlcKey = await makeKey(plcProduct, { expiresAt: new Date(Date.now() - 60_000) });
  const revokedPlcKey = await makeKey(plcProduct, { status: "REVOKED" });
  const usedUpPlcKey = await makeKey(plcProduct, {
    status: "EXHAUSTED",
    activationsCount: 1,
    activatedAt: new Date(),
    activatedByUserId: student.id,
  });
  const overrideAttemptPlcKey = await makeKey(plcProduct);

  return {
    suffix,
    password: TEST_PASSWORD,
    college,
    superAdmin,
    admin,
    student,
    student2,
    plcProduct,
    elecProduct,
    validPlcKey,
    validElecKey,
    expiredPlcKey,
    revokedPlcKey,
    usedUpPlcKey,
    overrideAttemptPlcKey,
  };
}

async function cleanupProductKeyFixtures(fx) {
  const userIds = [fx.superAdmin.id, fx.admin.id, fx.student.id, fx.student2.id];
  const productIds = [fx.plcProduct.id, fx.elecProduct.id];

  await prisma.userProductAccess.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.productKey.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.collegeProductLicense.deleteMany({ where: { collegeId: fx.college.id } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.college.deleteMany({ where: { id: fx.college.id } });
}

module.exports = { createProductKeyFixtures, cleanupProductKeyFixtures, TEST_PASSWORD };