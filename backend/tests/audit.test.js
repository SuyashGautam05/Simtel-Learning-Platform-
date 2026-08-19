/**
 * Audit logging test suite. Requires a real database via DATABASE_URL —
 * same prerequisites as the other test files in this directory.
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/db");
const { hashPassword } = require("../src/utils/password");
const { loginAs } = require("./helpers/auth");

const TEST_PASSWORD = "TestPass123";
let fx;
let cookies = {};

async function latestLogFor(action, targetId) {
  return prisma.auditLog.findFirst({
    where: { action, ...(targetId ? { targetId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

before(async () => {
  const suffix = Date.now();
  const passwordHash = await hashPassword(TEST_PASSWORD);

  const collegeA = await prisma.college.create({
    data: { name: "Audit Test College A", code: `ATC-A-${suffix}`, status: "ACTIVE" },
  });
  const collegeB = await prisma.college.create({
    data: { name: "Audit Test College B", code: `ATC-B-${suffix}`, status: "ACTIVE" },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "Audit Super Admin",
      email: `audit-superadmin.${suffix}@rbactest.local`,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
  const adminA = await prisma.user.create({
    data: {
      name: "Audit Admin A",
      email: `audit-admina.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });
  const adminB = await prisma.user.create({
    data: {
      name: "Audit Admin B",
      email: `audit-adminb.${suffix}@rbactest.local`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      collegeId: collegeB.id,
    },
  });
  const studentA = await prisma.user.create({
    data: {
      name: "Audit Student A",
      email: `audit-studenta.${suffix}@rbactest.local`,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId: collegeA.id,
    },
  });

  const product = await prisma.product.create({
    data: { name: `Audit Test PLC ${suffix}`, code: `AUPLC${suffix % 100000}`, status: "ACTIVE" },
  });

  fx = { suffix, collegeA, collegeB, superAdmin, adminA, adminB, studentA, product };

  cookies.superAdmin = await loginAs(app, superAdmin.email, TEST_PASSWORD);
  cookies.adminA = await loginAs(app, adminA.email, TEST_PASSWORD);
  cookies.adminB = await loginAs(app, adminB.email, TEST_PASSWORD);
  cookies.studentA = await loginAs(app, studentA.email, TEST_PASSWORD);
});

after(async () => {
  const userIds = [fx.superAdmin.id, fx.adminA.id, fx.adminB.id, fx.studentA.id];
  const collegeIds = [fx.collegeA.id, fx.collegeB.id];
  const suffixTag = String(fx.suffix);

  await prisma.userProductAccess.deleteMany({ where: { productId: fx.product.id } });
  await prisma.productKey.deleteMany({ where: { productId: fx.product.id } });
  await prisma.auditLog.deleteMany({
    where: { OR: [{ actorUserId: { in: userIds } }, { actorEmail: { contains: suffixTag } }] },
  });
  await prisma.refreshToken.deleteMany({ where: { user: { email: { contains: suffixTag } } } });
  await prisma.user.deleteMany({
    where: { OR: [{ id: { in: userIds } }, { email: { contains: suffixTag } }] },
  });
  await prisma.product.deleteMany({ where: { id: fx.product.id } });
  await prisma.college.deleteMany({ where: { id: { in: collegeIds } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Every required action actually gets logged, with the right shape
// ---------------------------------------------------------------------------

test("LOGIN is audit-logged with actor, IP, and user agent", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("User-Agent", "audit-test-agent/1.0")
    .send({ email: fx.studentA.email, password: TEST_PASSWORD });
  assert.strictEqual(res.status, 200);

  const log = await latestLogFor("LOGIN", fx.studentA.id);
  assert.ok(log, "expected a LOGIN audit entry");
  assert.strictEqual(log.actorUserId, fx.studentA.id);
  assert.strictEqual(log.actorEmail, fx.studentA.email);
  assert.strictEqual(log.userAgent, "audit-test-agent/1.0");
  assert.ok(log.ipAddress); // supertest requests still carry a loopback IP
});

test("FAILED_LOGIN is audit-logged on wrong password, without leaking the password", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: fx.studentA.email, password: "DefinitelyWrongPassword1" });
  assert.strictEqual(res.status, 401);

  const log = await latestLogFor("FAILED_LOGIN", fx.studentA.id);
  assert.ok(log, "expected a FAILED_LOGIN audit entry");
  assert.strictEqual(log.metadata?.reason, "wrong_password");
  assert.ok(!JSON.stringify(log.metadata ?? {}).includes("DefinitelyWrongPassword1"));
});

test("FAILED_LOGIN for a nonexistent account still logs the attempted email, no actorUserId", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: `nobody.${fx.suffix}@rbactest.local`, password: "WhateverPassword1" });
  assert.strictEqual(res.status, 401);

  const log = await prisma.auditLog.findFirst({
    where: { action: "FAILED_LOGIN", actorEmail: "unknown" },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(log);
  assert.strictEqual(log.actorUserId, null);
  assert.strictEqual(log.metadata?.attemptedEmail, `nobody.${fx.suffix}@rbactest.local`);
});

test("LOGOUT is audit-logged", async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: fx.studentA.email, password: TEST_PASSWORD });
  const sessionCookies = loginRes.headers["set-cookie"];

  await request(app).post("/api/auth/logout").set("Cookie", sessionCookies);

  const log = await latestLogFor("LOGOUT", fx.studentA.id);
  assert.ok(log, "expected a LOGOUT audit entry");
});

test("PASSWORD_CHANGED (self-service) is audit-logged without ever storing the password", async () => {
  const res = await request(app)
    .post("/api/auth/change-password")
    .set("Cookie", cookies.studentA)
    .send({ currentPassword: TEST_PASSWORD, newPassword: "NewTestPass456" });
  assert.strictEqual(res.status, 200);

  const log = await latestLogFor("PASSWORD_CHANGED", fx.studentA.id);
  assert.ok(log);
  assert.strictEqual(log.metadata?.selfService, true);
  assert.ok(!JSON.stringify(log.metadata ?? {}).includes("NewTestPass456"));
  assert.ok(!JSON.stringify(log.metadata ?? {}).includes(TEST_PASSWORD));

  // Re-login with the new password so later tests in this file keep working.
  cookies.studentA = await loginAs(app, fx.studentA.email, "NewTestPass456");
});

test("USER_CREATED and ADMIN_CREATED are logged distinctly, no password anywhere in metadata", async () => {
  const studentRes = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.adminA)
    .send({
      name: "Audit New Student",
      email: `audit-newstudent.${fx.suffix}@rbactest.local`,
      password: "SomeNewPass789",
      role: "USER",
    });
  assert.strictEqual(studentRes.status, 201);
  const userLog = await latestLogFor("USER_CREATED", studentRes.body.data.user.id);
  assert.ok(userLog);
  assert.ok(!JSON.stringify(userLog.metadata ?? {}).includes("SomeNewPass789"));

  const adminRes = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.superAdmin)
    .send({
      name: "Audit New Admin",
      email: `audit-newadmin.${fx.suffix}@rbactest.local`,
      password: "SomeAdminPass789",
      role: "ADMIN",
      collegeId: fx.collegeA.id,
    });
  assert.strictEqual(adminRes.status, 201);
  const adminLog = await latestLogFor("ADMIN_CREATED", adminRes.body.data.user.id);
  assert.ok(adminLog);
  assert.ok(!JSON.stringify(adminLog.metadata ?? {}).includes("SomeAdminPass789"));
});

test("USER_DEACTIVATED is logged", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.studentA.id}/deactivate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);

  const log = await latestLogFor("USER_DEACTIVATED", fx.studentA.id);
  assert.ok(log);

  // Reactivate for subsequent tests.
  await request(app).post(`/api/users/${fx.studentA.id}/activate`).set("Cookie", cookies.adminA);
});

test("PRODUCT_CREATED and PRODUCT_UPDATED are logged", async () => {
  const createRes = await request(app)
    .post("/api/products")
    .set("Cookie", cookies.superAdmin)
    .send({ name: `Audit New Module ${fx.suffix}`, code: `ANM${fx.suffix % 100000}` });
  assert.strictEqual(createRes.status, 201);
  const productId = createRes.body.data.product.id;

  const createdLog = await latestLogFor("PRODUCT_CREATED", productId);
  assert.ok(createdLog);

  const updateRes = await request(app)
    .put(`/api/products/${productId}`)
    .set("Cookie", cookies.superAdmin)
    .send({ description: "Updated via audit test" });
  assert.strictEqual(updateRes.status, 200);

  const updatedLog = await latestLogFor("PRODUCT_UPDATED", productId);
  assert.ok(updatedLog);

  await prisma.product.delete({ where: { id: productId } }).catch(() => null);
});

test("Full key lifecycle logs PRODUCT_KEY_GENERATED, PRODUCT_KEY_ACTIVATED, PRODUCT_ACCESS_GRANTED, and PRODUCT_KEY_REVOKED", async () => {
  const genRes = await request(app)
    .post("/api/product-keys/generate")
    .set("Cookie", cookies.superAdmin)
    .send({ productCode: fx.product.code, quantity: 1 });
  assert.strictEqual(genRes.status, 201);
  const key = genRes.body.data.keys[0];

  const genLog = await latestLogFor("PRODUCT_KEY_GENERATED", fx.product.id);
  assert.ok(genLog);
  assert.ok(!JSON.stringify(genLog.metadata ?? {}).includes(key.key)); // raw key never logged

  const activateRes = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.studentA)
    .send({ key: key.key });
  assert.strictEqual(activateRes.status, 201);

  const keyActivatedLog = await latestLogFor("PRODUCT_KEY_ACTIVATED", key.id);
  assert.ok(keyActivatedLog);
  assert.ok(!JSON.stringify(keyActivatedLog.metadata ?? {}).includes(key.key));

  const accessGrantedLog = await latestLogFor("PRODUCT_ACCESS_GRANTED", fx.product.id);
  assert.ok(accessGrantedLog);
  assert.strictEqual(accessGrantedLog.actorUserId, fx.studentA.id);

  const revokeRes = await request(app)
    .post(`/api/product-keys/${key.id}/revoke`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(revokeRes.status, 200);

  const revokedLog = await latestLogFor("PRODUCT_KEY_REVOKED", key.id);
  assert.ok(revokedLog);
});

test("PRODUCT_ACCESS_REVOKED is logged when an admin revokes access directly", async () => {
  const res = await request(app)
    .post("/api/admin/product-access/revoke")
    .set("Cookie", cookies.adminA)
    .send({ userId: fx.studentA.id, productId: fx.product.id });
  assert.strictEqual(res.status, 200);

  const log = await latestLogFor("PRODUCT_ACCESS_REVOKED", fx.studentA.id);
  assert.ok(log);
});

// ---------------------------------------------------------------------------
// RBAC on the audit log endpoint itself
// ---------------------------------------------------------------------------

test("SUPER_ADMIN sees audit logs across colleges", async () => {
  const res = await request(app)
    .get("/api/audit-logs?pageSize=200")
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 200);
  const actorIds = res.body.data.logs.map((l) => l.actorUserId);
  assert.ok(actorIds.includes(fx.adminA.id) || actorIds.includes(fx.studentA.id));
});

test("ADMIN sees audit activity relevant to their own college", async () => {
  const res = await request(app)
    .get("/api/audit-logs?pageSize=200")
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  const relevantIds = new Set([fx.adminA.id, fx.studentA.id]);
  assert.ok(
    res.body.data.logs.some(
      (l) => relevantIds.has(l.actorUserId) || relevantIds.has(l.targetId)
    )
  );
});

test("ADMIN's audit view never includes another college's admin activity", async () => {
  // Admin B creates a student in college B — generates a USER_CREATED log
  // actored by adminB, which Admin A must never see.
  const createRes = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.adminB)
    .send({
      name: "College B Student",
      email: `audit-collegeb-student.${fx.suffix}@rbactest.local`,
      password: "CollegeBPass789",
      role: "USER",
    });
  assert.strictEqual(createRes.status, 201);

  const res = await request(app)
    .get("/api/audit-logs?pageSize=200")
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.ok(!res.body.data.logs.some((l) => l.actorUserId === fx.adminB.id));
  assert.ok(!res.body.data.logs.some((l) => l.targetId === createRes.body.data.user.id));

  await prisma.user.delete({ where: { id: createRes.body.data.user.id } }).catch(() => null);
});

test("USER cannot access audit logs at all", async () => {
  const res = await request(app).get("/api/audit-logs").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Unauthenticated request to audit logs is rejected with 401, not 403", async () => {
  const res = await request(app).get("/api/audit-logs");
  assert.strictEqual(res.status, 401);
});