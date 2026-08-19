/**
 * Product Key / Module License test suite.
 * Requires a real database via DATABASE_URL and PRODUCT_KEY_PEPPER set in
 * .env — run with `npm test` (see tests/rbac.test.js for prerequisites,
 * identical setup applies here).
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/db");
const { createProductKeyFixtures, cleanupProductKeyFixtures } = require("./helpers/productKeyFixtures");
const { loginAs } = require("./helpers/auth");

let fx;
let cookies = {};

before(async () => {
  fx = await createProductKeyFixtures();
  cookies.superAdmin = await loginAs(app, fx.superAdmin.email, fx.password);
  cookies.admin = await loginAs(app, fx.admin.email, fx.password);
  cookies.student = await loginAs(app, fx.student.email, fx.password);
  cookies.student2 = await loginAs(app, fx.student2.email, fx.password);
});

after(async () => {
  await cleanupProductKeyFixtures(fx);
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// 1. Valid PLC key activates successfully
// ---------------------------------------------------------------------------
test("Valid PLC key activates and grants PLC access", async () => {
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.student)
    .send({ key: fx.validPlcKey.rawKey });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.product.code, fx.plcProduct.code);
  assert.strictEqual(res.body.data.access.status, "ACTIVE");
});

// ---------------------------------------------------------------------------
// 2. Invalid key is rejected
// SECURITY: as of the security audit, this and the next two tests all
// assert the SAME generic 400 + message — invalid, expired, and revoked
// keys must be indistinguishable to the caller (see activation.service.js
// for the fix and rationale). The real reason is still recorded in the
// audit log; that's checked separately below.
// ---------------------------------------------------------------------------
test("Invalid/unknown key is rejected with a generic error, no distinguishing detail", async () => {
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.student)
    .send({ key: "NOPE-0000-0000-0000" });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, "Invalid or expired product key");
});

// ---------------------------------------------------------------------------
// 3. Expired key is rejected — same generic response as an unknown key
// ---------------------------------------------------------------------------
test("Expired key is rejected with the same generic error as an unknown key", async () => {
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.admin) // admin has no PLC access yet — safe activator for this check
    .send({ key: fx.expiredPlcKey.rawKey });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, "Invalid or expired product key");

  const updated = await prisma.productKey.findUnique({ where: { id: fx.expiredPlcKey.key.id } });
  assert.strictEqual(updated.status, "EXPIRED"); // internal state still correctly tracked

  const auditLog = await prisma.auditLog.findFirst({
    where: { action: "PRODUCT_KEY_ACTIVATION_FAILED", targetId: fx.expiredPlcKey.key.id },
    orderBy: { createdAt: "desc" },
  });
  assert.strictEqual(auditLog?.metadata?.reason, "expired"); // real reason IS captured, just server-side only
});

// ---------------------------------------------------------------------------
// 4. Revoked key is rejected — same generic response as an unknown key
// ---------------------------------------------------------------------------
test("Revoked key is rejected with the same generic error as an unknown key", async () => {
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.admin)
    .send({ key: fx.revokedPlcKey.rawKey });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, "Invalid or expired product key");
});

// ---------------------------------------------------------------------------
// 5. Already-used (exhausted) key is rejected — same generic response
// ---------------------------------------------------------------------------
test("Already-used (exhausted) key is rejected with the same generic error", async () => {
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.admin)
    .send({ key: fx.usedUpPlcKey.rawKey });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.message, "Invalid or expired product key");
});

// ---------------------------------------------------------------------------
// 6. Electrical key cannot unlock PLC
// ---------------------------------------------------------------------------
test("An Electrical key activates Electrical only — PLC stays locked", async () => {
  const activateRes = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.admin)
    .send({ key: fx.validElecKey.rawKey });
  assert.strictEqual(activateRes.status, 201);
  assert.strictEqual(activateRes.body.data.product.code, fx.elecProduct.code);

  const myProducts = await request(app).get("/api/my-products").set("Cookie", cookies.admin);
  assert.strictEqual(myProducts.status, 200);
  // ADMIN sees the full active catalog by role, not by access grant, so
  // assert via the actual access record instead of /my-products for a
  // precise signal here.
  const access = await prisma.userProductAccess.findMany({ where: { userId: fx.admin.id } });
  const productIds = access.map((a) => a.productId);
  assert.ok(productIds.includes(fx.elecProduct.id));
  assert.ok(!productIds.includes(fx.plcProduct.id));
});

// ---------------------------------------------------------------------------
// 7. User cannot manually change the product ID
// ---------------------------------------------------------------------------
test("Submitting a productId alongside a PLC key is ignored — product is derived from the key", async () => {
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.student2) // fresh user, no prior access, isolates this check
    .send({ key: fx.overrideAttemptPlcKey.rawKey, productId: fx.elecProduct.id }); // attempted override

  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.product.code, fx.plcProduct.code); // derived from the key, never Electrical

  const access = await prisma.userProductAccess.findUnique({
    where: { userId_productId: { userId: fx.student2.id, productId: fx.plcProduct.id } },
  });
  assert.ok(access, "access should be granted for the product the KEY belongs to");
  const elecAccess = await prisma.userProductAccess.findUnique({
    where: { userId_productId: { userId: fx.student2.id, productId: fx.elecProduct.id } },
  });
  assert.strictEqual(elecAccess, null, "no access should exist for the spoofed productId");
});

// ---------------------------------------------------------------------------
// 8 & 9. Unauthorized user cannot access module / authorized user can
// ---------------------------------------------------------------------------
test("User without access is forbidden from module content", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.elecProduct.code}/content/theory`)
    .set("Cookie", cookies.student); // student has PLC, not Electrical
  assert.strictEqual(res.status, 403);
});

test("User with access can reach module content", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.code}/content/theory`)
    .set("Cookie", cookies.student);
  assert.strictEqual(res.status, 200);
});

// ---------------------------------------------------------------------------
// 10. ADMIN cannot generate platform keys
// ---------------------------------------------------------------------------
test("ADMIN cannot generate product keys — SUPER_ADMIN only", async () => {
  const res = await request(app)
    .post("/api/product-keys/generate")
    .set("Cookie", cookies.admin)
    .send({ productCode: fx.plcProduct.code, quantity: 1 });
  assert.strictEqual(res.status, 403);
});

// ---------------------------------------------------------------------------
// 11. SUPER_ADMIN can manage all keys (generate, list, revoke, reactivate)
// ---------------------------------------------------------------------------
test("SUPER_ADMIN can generate, list, revoke, and reactivate keys", async () => {
  const genRes = await request(app)
    .post("/api/product-keys/generate")
    .set("Cookie", cookies.superAdmin)
    .send({ productCode: fx.plcProduct.code, quantity: 2, maxActivations: 1 });
  assert.strictEqual(genRes.status, 201);
  assert.strictEqual(genRes.body.data.keys.length, 2);
  assert.ok(genRes.body.data.keys[0].key.startsWith(`${fx.plcProduct.code}-`));

  const newKeyId = genRes.body.data.keys[0].id;

  const listRes = await request(app)
    .get(`/api/product-keys?productCode=${fx.plcProduct.code}`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(listRes.status, 200);
  assert.ok(listRes.body.data.keys.some((k) => k.id === newKeyId));
  // Raw key never appears in the list response.
  assert.ok(listRes.body.data.keys.every((k) => k.key === undefined));

  const revokeRes = await request(app)
    .post(`/api/product-keys/${newKeyId}/revoke`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(revokeRes.status, 200);
  assert.strictEqual(revokeRes.body.data.key.status, "REVOKED");

  const reactivateRes = await request(app)
    .post(`/api/product-keys/${newKeyId}/reactivate`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(reactivateRes.status, 200);
  assert.strictEqual(reactivateRes.body.data.key.status, "UNUSED");
});

test("Unauthenticated activation attempt is rejected with 401", async () => {
  const res = await request(app).post("/api/product-keys/activate").send({ key: "PLC-0000-0000-0000" });
  assert.strictEqual(res.status, 401);
});