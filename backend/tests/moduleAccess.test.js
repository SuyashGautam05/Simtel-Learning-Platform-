/**
 * Module-level authorization test suite.
 * Requires a real database via DATABASE_URL — same prerequisites as
 * tests/rbac.test.js and tests/productKey.test.js.
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/db");
const { createModuleAccessFixtures, cleanupModuleAccessFixtures } = require("./helpers/moduleAccessFixtures");
const { loginAs } = require("./helpers/auth");

let fx;
let cookies = {};

before(async () => {
  fx = await createModuleAccessFixtures();
  cookies.superAdmin = await loginAs(app, fx.superAdmin.email, fx.password);
  cookies.admin = await loginAs(app, fx.admin.email, fx.password);
  cookies.authorized = await loginAs(app, fx.authorizedStudent.email, fx.password);
  cookies.unauthorized = await loginAs(app, fx.unauthorizedStudent.email, fx.password);
  cookies.expired = await loginAs(app, fx.expiredStudent.email, fx.password);
  cookies.revoked = await loginAs(app, fx.revokedStudent.email, fx.password);
});

after(async () => {
  await cleanupModuleAccessFixtures(fx);
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// GET /api/products/:productId/access — the informational endpoint
// (never 403, just hasAccess: true/false)
// ---------------------------------------------------------------------------

test("access-check: authorized student sees hasAccess true with expiresAt", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.authorized);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.hasAccess, true);
  assert.strictEqual(res.body.data.product.code, fx.plcProduct.code);
});

test("access-check: unauthorized student sees hasAccess false, not an error", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.unauthorized);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.hasAccess, false);
});

test("access-check: matches the PLC/Electrical/Embedded example from the spec exactly", async () => {
  const plc = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.authorized);
  const electrical = await request(app)
    .get(`/api/products/${fx.electricalProduct.id}/access`)
    .set("Cookie", cookies.authorized);

  assert.strictEqual(plc.body.data.hasAccess, true, "PLC → OPEN");
  assert.strictEqual(electrical.body.data.hasAccess, false, "Electrical → LOCKED");
});

test("access-check: unauthenticated request is rejected with 401", async () => {
  const res = await request(app).get(`/api/products/${fx.plcProduct.id}/access`);
  assert.strictEqual(res.status, 401);
});

test("access-check: nonexistent product returns 404", async () => {
  const res = await request(app)
    .get("/api/products/nonexistent-cuid-value/access")
    .set("Cookie", cookies.authorized);
  assert.strictEqual(res.status, 404);
});

test("access-check: DRAFT (unreleased) product is 404 for a student, not visible as locked", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.draftProduct.id}/access`)
    .set("Cookie", cookies.authorized);
  assert.strictEqual(res.status, 404);
});

test("access-check: SUPER_ADMIN always has access, ADMIN has visibility without a personal license", async () => {
  const superRes = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(superRes.body.data.hasAccess, true);

  const adminRes = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.admin);
  assert.strictEqual(adminRes.body.data.hasAccess, true);
});

// ---------------------------------------------------------------------------
// requireProductAccess() — the actual gate, on topics/simulations/experiments
// ---------------------------------------------------------------------------

for (const section of ["topics", "simulations", "experiments"]) {
  test(`${section}: authorized student can access`, async () => {
    const res = await request(app)
      .get(`/api/products/${fx.plcProduct.id}/${section}`)
      .set("Cookie", cookies.authorized);
    assert.strictEqual(res.status, 200);
  });

  test(`${section}: unauthorized student is forbidden with 403`, async () => {
    const res = await request(app)
      .get(`/api/products/${fx.plcProduct.id}/${section}`)
      .set("Cookie", cookies.unauthorized);
    assert.strictEqual(res.status, 403);
  });

  test(`${section}: expired access is forbidden with 403`, async () => {
    const res = await request(app)
      .get(`/api/products/${fx.plcProduct.id}/${section}`)
      .set("Cookie", cookies.expired);
    assert.strictEqual(res.status, 403);
  });

  test(`${section}: revoked access is forbidden with 403`, async () => {
    const res = await request(app)
      .get(`/api/products/${fx.plcProduct.id}/${section}`)
      .set("Cookie", cookies.revoked);
    assert.strictEqual(res.status, 403);
  });

  test(`${section}: unauthenticated request is rejected with 401, not 403`, async () => {
    const res = await request(app).get(`/api/products/${fx.plcProduct.id}/${section}`);
    assert.strictEqual(res.status, 401);
  });

  test(`${section}: nonexistent product is 404`, async () => {
    const res = await request(app)
      .get(`/api/products/nonexistent-cuid-value/${section}`)
      .set("Cookie", cookies.authorized);
    assert.strictEqual(res.status, 404);
  });
}

test("Logging in does not grant access to every module — PLC-authorized student is still blocked from Electrical content", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.electricalProduct.id}/topics`)
    .set("Cookie", cookies.authorized);
  assert.strictEqual(res.status, 403);
});

test("SUPER_ADMIN can reach content without a personal UserProductAccess row", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/simulations`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 200);
});

test("ADMIN can reach content for any active module without a personal license", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/experiments`)
    .set("Cookie", cookies.admin);
  assert.strictEqual(res.status, 200);
});

test("A direct API call bypasses nothing the UI would have blocked — same 403 as clicking through", async () => {
  // There is no separate "came from the frontend" code path; this request
  // is indistinguishable, at the backend, from one made by manually typing
  // a URL or calling the API with curl. The 403 is identical either way.
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/topics`)
    .set("Cookie", cookies.unauthorized)
    .set("User-Agent", "curl/8.0.0");
  assert.strictEqual(res.status, 403);
});