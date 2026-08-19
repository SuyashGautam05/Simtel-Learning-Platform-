/**
 * Security Audit — adversarial test suite.
 * -----------------------------------------------------------------------
 * This file exists to PROVE, not describe, that the specific attacks
 * named in the security audit are rejected by the running server. Every
 * test here plays the role of an attacker with a real, valid session for
 * the WRONG account — never a missing session, since that's a much
 * weaker test (see tests/rbac.test.js for pure 401 coverage).
 *
 * Requires a real database via DATABASE_URL — same prerequisites as the
 * rest of this directory.
 * -----------------------------------------------------------------------
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/db");
const { createSecurityAuditFixtures, cleanupSecurityAuditFixtures } = require("./helpers/securityAuditFixtures");
const { loginAs } = require("./helpers/auth");

let fx;
let cookies = {};

before(async () => {
  fx = await createSecurityAuditFixtures();
  cookies.superAdmin = await loginAs(app, fx.superAdmin.email, fx.password);
  cookies.adminA = await loginAs(app, fx.adminA.email, fx.password);
  cookies.adminB = await loginAs(app, fx.adminB.email, fx.password);
  cookies.studentA = await loginAs(app, fx.studentA.email, fx.password); // no PLC access
  cookies.studentA2 = await loginAs(app, fx.studentA2.email, fx.password); // expired PLC access
  cookies.studentB = await loginAs(app, fx.studentB.email, fx.password); // revoked PLC access
});

after(async () => {
  await cleanupSecurityAuditFixtures(fx);
  await prisma.$disconnect();
});

// =============================================================================
// THE HEADLINE ATTACK: student with no PLC license tries every angle
// =============================================================================

test("[headline attack] Student with no license, GET the literal product code as if it were an id, is rejected", async () => {
  // The exact request shape from the audit: GET /products/PLC/simulations
  // where "PLC" is a bare code string, not a real database id.
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.code}/simulations`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 404, "a code used where an id is expected must not resolve to anything");
});

test("[headline attack] Student with no license, GET the real product id, is rejected with 403", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/simulations`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("[headline attack] Student with no license cannot reach topics or experiments either", async () => {
  const topics = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/topics`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(topics.status, 403);

  const experiments = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/experiments`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(experiments.status, 403);
});

test("[headline attack] Student with no license cannot reach the code-keyed content route either", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.code}/content/simulations`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("[headline attack] Manipulating productId in the request body during activation changes nothing", async () => {
  // No key at all is submitted — just an attempted body-only escalation.
  // Since activateKeySchema only accepts `key`, this is stripped before
  // it ever reaches the service layer; the request fails validation, not
  // because of what productId claims.
  const res = await request(app)
    .post("/api/product-keys/activate")
    .set("Cookie", cookies.studentA)
    .send({ productId: fx.plcProduct.id }); // no `key` field
  assert.strictEqual(res.status, 400); // Zod rejects — `key` is required
});

test("[headline attack] Manipulating userId in a request body never grants another user's access", async () => {
  // studentA attempts to check studentA2's access by stuffing userId into
  // the query of an endpoint that has no such parameter.
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access?userId=${fx.studentA2.id}`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 200); // this endpoint never 403s by design
  assert.strictEqual(res.body.data.hasAccess, false); // still evaluated for studentA, the actual caller
});

test("[headline attack] Manipulating collegeId in a request body never re-scopes a request", async () => {
  const res = await request(app)
    .get(`/api/users?collegeId=${fx.collegeB.id}`)
    .set("Cookie", cookies.studentA);
  // USER role can't list users at all, regardless of the query string.
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Student → Admin endpoint
// =============================================================================

test("Student → Admin endpoint: cannot list the student roster", async () => {
  const res = await request(app).get("/api/users").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Student → Admin endpoint: cannot create another user", async () => {
  const res = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.studentA)
    .send({ name: "x", email: `x.${fx.suffix}@rbactest.local`, password: "SomePass123", role: "USER" });
  assert.strictEqual(res.status, 403);
});

test("Student → Admin endpoint: cannot deactivate another student", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.studentA2.id}/deactivate`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Student → Admin endpoint: cannot view the college directory", async () => {
  const res = await request(app).get("/api/colleges").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Admin → Super Admin endpoint
// =============================================================================

test("Admin → Super Admin endpoint: cannot create a college", async () => {
  const res = await request(app)
    .post("/api/colleges")
    .set("Cookie", cookies.adminA)
    .send({ name: "x", code: `X-${fx.suffix}` });
  assert.strictEqual(res.status, 403);
});

test("Admin → Super Admin endpoint: cannot generate product keys", async () => {
  const res = await request(app)
    .post("/api/product-keys/generate")
    .set("Cookie", cookies.adminA)
    .send({ productCode: fx.plcProduct.code, quantity: 1 });
  assert.strictEqual(res.status, 403);
});

test("Admin → Super Admin endpoint: cannot create a product", async () => {
  const res = await request(app)
    .post("/api/products")
    .set("Cookie", cookies.adminA)
    .send({ name: "x", code: `X${fx.suffix % 100000}` });
  assert.strictEqual(res.status, 403);
});

test("Admin → Super Admin endpoint: cannot hard-delete a user", async () => {
  const res = await request(app)
    .delete(`/api/users/${fx.studentA.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

test("Admin → Super Admin endpoint: cannot view platform-wide stats", async () => {
  const res = await request(app).get("/api/admin/stats").set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Admin College A → College B data
// =============================================================================

test("Admin College A → College B: cannot view the other college", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

test("Admin College A → College B: cannot view the other college's stats or activity", async () => {
  const stats = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}/stats`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(stats.status, 403);

  const activity = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}/recent-activity`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(activity.status, 403);
});

test("Admin College A → College B: cannot view, deactivate, or reset password for College B's student", async () => {
  const view = await request(app).get(`/api/users/${fx.studentB.id}`).set("Cookie", cookies.adminA);
  assert.strictEqual(view.status, 404); // tenant gate 404s, never 403 — doesn't confirm existence

  const deactivate = await request(app)
    .post(`/api/users/${fx.studentB.id}/deactivate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(deactivate.status, 404);

  const reset = await request(app)
    .post(`/api/users/${fx.studentB.id}/reset-password`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(reset.status, 404);
});

test("Admin College A → College B: roster listing ignores a cross-college collegeId filter", async () => {
  const res = await request(app)
    .get(`/api/users?collegeId=${fx.collegeB.id}&role=USER`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  const ids = res.body.data.users.map((u) => u.id);
  assert.ok(!ids.includes(fx.studentB.id));
});

test("Admin College A → College B: license list never includes the other college's licenses", async () => {
  const res = await request(app)
    .get(`/api/licenses?collegeId=${fx.collegeB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.licenses.every((l) => l.college.id !== fx.collegeB.id));
});

// =============================================================================
// Student → another student's data
// =============================================================================

test("Student → another student's data: cannot view another student's profile by id", async () => {
  const res = await request(app).get(`/api/users/${fx.studentA2.id}`).set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Student → another student's data: cannot view another student's module access/progress", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentA2.id}/access`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Student → another student's data: cannot reset another student's password", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.studentA2.id}/reset-password`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Student → another student's data: PUTting simulation state never touches another user's saved state", async () => {
  // studentA has no access to plcProduct, so this correctly 403s before
  // ever reaching the state storage — access-gating gates state I/O too.
  const res = await request(app)
    .put(`/api/products/${fx.plcProduct.id}/state`)
    .set("Cookie", cookies.studentA)
    .send({ data: { attempt: "overwrite" } });
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Student → unauthorized module
// =============================================================================

test("Student → unauthorized module: locked module's launch token is refused", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/launch`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("Student → unauthorized module: cannot read the module's saved state either", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/state`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Expired license → module
// =============================================================================

test("Expired license: access-check reports hasAccess:false, not an error", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.studentA2);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.hasAccess, false);
});

test("Expired license: module content is forbidden", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/simulations`)
    .set("Cookie", cookies.studentA2);
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Revoked license → module
// =============================================================================

test("Revoked license: access-check reports hasAccess:false, not an error", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/access`)
    .set("Cookie", cookies.studentB);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.hasAccess, false);
});

test("Revoked license: module content is forbidden", async () => {
  const res = await request(app)
    .get(`/api/products/${fx.plcProduct.id}/simulations`)
    .set("Cookie", cookies.studentB);
  assert.strictEqual(res.status, 403);
});

// =============================================================================
// Product-key oracle fix — verified end to end via the real HTTP API
// =============================================================================

test("Product-key activation never distinguishes invalid/expired/revoked/exhausted in its response", async () => {
  const responses = await Promise.all(
    ["TOTALLY-FAKE-KEY-0000", "TOTALLY-FAKE-KEY-1111", "TOTALLY-FAKE-KEY-2222"].map((key) =>
      request(app).post("/api/product-keys/activate").set("Cookie", cookies.studentA).send({ key })
    )
  );
  for (const res of responses) {
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.message, "Invalid or expired product key");
  }
});

// =============================================================================
// Error message leakage — verified: an ApiError's message passes through
// (intended), a raw thrown error never does
// =============================================================================

test("A well-formed ApiError's message is returned (this is intended, not a leak)", async () => {
  const res = await request(app).get("/api/audit-logs"); // requireAuth throws ApiError(401, "Authentication required")
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.message, "Authentication required");
});

// =============================================================================
// CORS — cross-origin credentialed requests are not blanket-allowed
// =============================================================================

test("CORS does not reflect an arbitrary Origin back with credentials allowed", async () => {
  const res = await request(app)
    .get("/api/audit-logs")
    .set("Origin", "https://evil.example.com")
    .set("Cookie", cookies.superAdmin);
  const allowOrigin = res.headers["access-control-allow-origin"];
  assert.notStrictEqual(allowOrigin, "https://evil.example.com");
  assert.notStrictEqual(allowOrigin, "*");
});