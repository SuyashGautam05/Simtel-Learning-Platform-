/**
 * RBAC integration tests.
 * -----------------------------------------------------------------------
 * Requires a real database reachable via DATABASE_URL (a dedicated test
 * database is strongly recommended — this suite creates and deletes real
 * rows). Run with:
 *
 *   npx prisma generate
 *   npx prisma migrate deploy      # or migrate dev against a test DB
 *   npm test
 *
 * These are integration, not unit, tests: they exercise the real Express
 * app (src/app.js) through supertest, with real Prisma/Postgres calls, so
 * that the tests verify enforcement actually happening on the server —
 * per the requirement that RBAC must be enforced server-side, not just
 * hidden in the UI.
 * -----------------------------------------------------------------------
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/db");
const { createFixtures, cleanupFixtures } = require("./helpers/fixtures");
const { loginAs } = require("./helpers/auth");

let fx;
let cookies = {};

before(async () => {
  fx = await createFixtures();
  cookies.superAdmin = await loginAs(app, fx.superAdmin.email, fx.password);
  cookies.adminA = await loginAs(app, fx.adminA.email, fx.password);
  cookies.adminB = await loginAs(app, fx.adminB.email, fx.password);
  cookies.studentA = await loginAs(app, fx.studentA.email, fx.password);
  cookies.studentB = await loginAs(app, fx.studentB.email, fx.password);
});

after(async () => {
  await cleanupFixtures(fx);
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// SUPER_ADMIN access
// ---------------------------------------------------------------------------

test("SUPER_ADMIN can list all colleges", async () => {
  const res = await request(app).get("/api/colleges").set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 200);
  const codes = res.body.data.colleges.map((c) => c.code);
  assert.ok(codes.includes(fx.collegeA.code));
  assert.ok(codes.includes(fx.collegeB.code));
});

test("SUPER_ADMIN can create a college", async () => {
  const res = await request(app)
    .post("/api/colleges")
    .set("Cookie", cookies.superAdmin)
    .send({ name: "New Test College", code: `NTC-${fx.suffix}` });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.college.code, `NTC-${fx.suffix}`);
});

test("SUPER_ADMIN can view any college by id, including one they didn't create", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.college.id, fx.collegeB.id);
});

test("SUPER_ADMIN can list users across every college", async () => {
  const res = await request(app).get("/api/users").set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 200);
  const emails = res.body.data.users.map((u) => u.email);
  assert.ok(emails.includes(fx.studentA.email));
  assert.ok(emails.includes(fx.studentB.email));
});

test("SUPER_ADMIN can create an ADMIN account for a given college", async () => {
  const res = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.superAdmin)
    .send({
      name: "New Admin",
      email: `newadmin.${fx.suffix}@rbactest.local`,
      password: "TestPass123",
      role: "ADMIN",
      collegeId: fx.collegeA.id,
    });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.user.role, "ADMIN");
  assert.strictEqual(res.body.data.user.collegeId, fx.collegeA.id);
});

test("SUPER_ADMIN can view audit logs", async () => {
  const res = await request(app).get("/api/audit-logs").set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.data.logs));
});

// ---------------------------------------------------------------------------
// ADMIN access (own college only)
// ---------------------------------------------------------------------------

test("ADMIN can view their own college", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeA.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.college.id, fx.collegeA.id);
});

test("ADMIN can list students in their own college", async () => {
  const res = await request(app).get("/api/users").set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  const users = res.body.data.users;
  assert.ok(users.every((u) => u.collegeId === fx.collegeA.id));
  assert.ok(users.every((u) => u.role === "USER"));
});

test("ADMIN can create a student in their own college", async () => {
  const res = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.adminA)
    .send({
      name: "New Student",
      email: `newstudent.${fx.suffix}@rbactest.local`,
      password: "TestPass123",
      role: "USER",
      collegeId: fx.collegeB.id, // deliberately wrong college — must be ignored
    });
  assert.strictEqual(res.status, 201);
  // collegeId is forced server-side to the admin's own college, regardless
  // of what was submitted in the request body.
  assert.strictEqual(res.body.data.user.collegeId, fx.collegeA.id);
});

test("ADMIN attempting to create an ADMIN or SUPER_ADMIN is silently downgraded to USER", async () => {
  const res = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.adminA)
    .send({
      name: "Escalation Attempt",
      email: `escalate.${fx.suffix}@rbactest.local`,
      password: "TestPass123",
      role: "SUPER_ADMIN",
    });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.user.role, "USER");
});

test("ADMIN can deactivate and reactivate their own college's student", async () => {
  const deactivate = await request(app)
    .post(`/api/users/${fx.studentA.id}/deactivate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(deactivate.status, 200);
  assert.strictEqual(deactivate.body.data.user.status, "SUSPENDED");

  const reactivate = await request(app)
    .post(`/api/users/${fx.studentA.id}/activate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(reactivate.status, 200);
  assert.strictEqual(reactivate.body.data.user.status, "ACTIVE");
});

// ---------------------------------------------------------------------------
// Cross-college access denial — the core "change the ID in the URL" test
// ---------------------------------------------------------------------------

test("ADMIN cannot view another college's record via /api/colleges/:id", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

test("ADMIN cannot view another college's student by editing the :userId in the URL", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentB.id}`)
    .set("Cookie", cookies.adminA);
  // 404, not 403 — deliberately doesn't confirm the id exists outside
  // the admin's tenant (see role.middleware.js comments).
  assert.strictEqual(res.status, 404);
});

test("ADMIN cannot deactivate another college's student by ID", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.studentB.id}/deactivate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 404);
});

test("ADMIN's user list ignores a collegeId query param for another college", async () => {
  const res = await request(app)
    .get(`/api/users?collegeId=${fx.collegeB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  // Every result is still scoped to the admin's own college — the
  // querystring collegeId was ignored, not honored.
  assert.ok(res.body.data.users.every((u) => u.collegeId === fx.collegeA.id));
});

test("ADMIN cannot manage another ADMIN's account, even in scope-adjacent ways", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.adminB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 404);
});

// ---------------------------------------------------------------------------
// USER access
// ---------------------------------------------------------------------------

test("USER can view their own profile", async () => {
  const res = await request(app).get("/api/users/me").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.user.email, fx.studentA.email);
});

test("USER can update their own permitted profile fields", async () => {
  const res = await request(app)
    .patch("/api/users/me")
    .set("Cookie", cookies.studentA)
    .send({ name: "Updated Student Name" });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.user.name, "Updated Student Name");
});

test("USER cannot list the user roster (forbidden, not just hidden)", async () => {
  const res = await request(app).get("/api/users").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("USER cannot view another user's profile by ID", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentB.id}`)
    .set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("USER cannot access the college directory", async () => {
  const res = await request(app).get("/api/colleges").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

test("USER cannot access audit logs", async () => {
  const res = await request(app).get("/api/audit-logs").set("Cookie", cookies.studentA);
  assert.strictEqual(res.status, 403);
});

// ---------------------------------------------------------------------------
// Unauthorized (no session) requests
// ---------------------------------------------------------------------------

test("Unauthenticated request to a protected route is rejected with 401", async () => {
  const res = await request(app).get("/api/users/me");
  assert.strictEqual(res.status, 401);
});

test("Unauthenticated request to an admin route is rejected with 401, not 403", async () => {
  const res = await request(app).get("/api/colleges");
  assert.strictEqual(res.status, 401);
});

test("A garbage/expired bearer token is rejected with 401", async () => {
  const res = await request(app)
    .get("/api/users/me")
    .set("Authorization", "Bearer not-a-real-token");
  assert.strictEqual(res.status, 401);
});

// ---------------------------------------------------------------------------
// Forbidden (authenticated, wrong role) requests
// ---------------------------------------------------------------------------

test("ADMIN is forbidden from SUPER_ADMIN-only college creation", async () => {
  const res = await request(app)
    .post("/api/colleges")
    .set("Cookie", cookies.adminA)
    .send({ name: "Should Not Exist", code: `SHOULD-NOT-${fx.suffix}` });
  assert.strictEqual(res.status, 403);
});

test("ADMIN is forbidden from deleting a user (SUPER_ADMIN only)", async () => {
  const res = await request(app)
    .delete(`/api/users/${fx.studentA.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

test("Nobody can deactivate a SUPER_ADMIN through the user-management endpoint", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.superAdmin.id}/deactivate`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(res.status, 403);
});