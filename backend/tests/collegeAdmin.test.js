/**
 * College Admin dashboard test suite — dedicated coverage for
 * cross-college access attempts, per the spec's explicit requirement.
 * Requires a real database via DATABASE_URL — same prerequisites as the
 * other test files in this directory.
 */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");
const prisma = require("../src/config/db");
const { createCollegeAdminFixtures, cleanupCollegeAdminFixtures } = require("./helpers/collegeAdminFixtures");
const { loginAs } = require("./helpers/auth");

let fx;
let cookies = {};

before(async () => {
  fx = await createCollegeAdminFixtures();
  cookies.superAdmin = await loginAs(app, fx.superAdmin.email, fx.password);
  cookies.adminA = await loginAs(app, fx.adminA.email, fx.password);
  cookies.adminB = await loginAs(app, fx.adminB.email, fx.password);
});

after(async () => {
  await cleanupCollegeAdminFixtures(fx);
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Dashboard: stats + recent activity, own college only
// ---------------------------------------------------------------------------

test("ADMIN can view their own college's stats", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeA.id}/stats`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.totalStudents, 1);
  assert.strictEqual(res.body.data.activeStudents, 1);
  assert.strictEqual(res.body.data.assignedModules, 1);
  assert.strictEqual(res.body.data.activeLicenses, 1);
  assert.strictEqual(res.body.data.averageProgress, null);
});

test("ADMIN cannot view another college's stats", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}/stats`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

test("ADMIN can view their own college's recent activity", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeA.id}/recent-activity`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.activity.some((a) => a.student.id === fx.studentA.id));
});

test("ADMIN cannot view another college's recent activity", async () => {
  const res = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}/recent-activity`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 403);
});

test("SUPER_ADMIN can view stats and activity for any college", async () => {
  const statsRes = await request(app)
    .get(`/api/colleges/${fx.collegeB.id}/stats`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(statsRes.status, 200);

  const activityRes = await request(app)
    .get(`/api/colleges/${fx.collegeA.id}/recent-activity`)
    .set("Cookie", cookies.superAdmin);
  assert.strictEqual(activityRes.status, 200);
});

// ---------------------------------------------------------------------------
// Students: create / view / activate / deactivate — cross-college denial
// ---------------------------------------------------------------------------

test("ADMIN can view their own college's student", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentA.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.user.id, fx.studentA.id);
});

test("ADMIN cannot view another college's student by ID", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 404);
});

test("ADMIN cannot activate/deactivate another college's student", async () => {
  const deactivateRes = await request(app)
    .post(`/api/users/${fx.studentB.id}/deactivate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(deactivateRes.status, 404);

  const activateRes = await request(app)
    .post(`/api/users/${fx.studentB.id}/activate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(activateRes.status, 404);
});

test("ADMIN can deactivate/reactivate their own college's student", async () => {
  const deactivateRes = await request(app)
    .post(`/api/users/${fx.studentA.id}/deactivate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(deactivateRes.status, 200);
  assert.strictEqual(deactivateRes.body.data.user.status, "SUSPENDED");

  const activateRes = await request(app)
    .post(`/api/users/${fx.studentA.id}/activate`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(activateRes.status, 200);
  assert.strictEqual(activateRes.body.data.user.status, "ACTIVE");
});

test("A newly created student is always placed in the creating ADMIN's college, never a spoofed one", async () => {
  const res = await request(app)
    .post("/api/users")
    .set("Cookie", cookies.adminA)
    .send({
      name: "Spoof Attempt Student",
      email: `ca-spoof.${fx.suffix}@rbactest.local`,
      password: "TestPass123",
      role: "USER",
      collegeId: fx.collegeB.id, // deliberately someone else's college
    });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.data.user.collegeId, fx.collegeA.id);
});

// ---------------------------------------------------------------------------
// Reset password — the "secure workflow," cross-college denial
// ---------------------------------------------------------------------------

test("ADMIN can reset their own college's student's password", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.studentA.id}/reset-password`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.tempPassword);
  assert.ok(res.body.data.tempPassword.length >= 12);

  // The new temp password actually works...
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: fx.studentA.email, password: res.body.data.tempPassword });
  assert.strictEqual(loginRes.status, 200);

  // ...and the OLD password no longer does.
  const oldLoginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: fx.studentA.email, password: fx.password });
  assert.strictEqual(oldLoginRes.status, 401);
});

test("ADMIN cannot reset another college's student's password", async () => {
  const res = await request(app)
    .post(`/api/users/${fx.studentB.id}/reset-password`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 404);
});

// ---------------------------------------------------------------------------
// View student progress (module access list) — cross-college denial
// ---------------------------------------------------------------------------

test("ADMIN can view their own college's student's module access", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentA.id}/access`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.data.access));
});

test("ADMIN cannot view another college's student's module access", async () => {
  const res = await request(app)
    .get(`/api/users/${fx.studentB.id}/access`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 404);
});

// ---------------------------------------------------------------------------
// Modules & licenses — college-scoped visibility
// ---------------------------------------------------------------------------

test("ADMIN's license list is scoped to their own college even if another collegeId is requested", async () => {
  const res = await request(app)
    .get(`/api/licenses?collegeId=${fx.collegeB.id}`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  // Every result is still scoped to collegeA — the query param was ignored.
  assert.ok(res.body.data.licenses.every((l) => l.college.id === fx.collegeA.id));
});

test("ADMIN B sees no licenses belonging to college A", async () => {
  const res = await request(app).get("/api/licenses").set("Cookie", cookies.adminB);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.licenses.every((l) => l.college.id === fx.collegeB.id));
});

// ---------------------------------------------------------------------------
// Roster listing — the collegeId-in-querystring attack, one more time in
// this dashboard's own context
// ---------------------------------------------------------------------------

test("ADMIN's student roster never includes another college's students, even via query manipulation", async () => {
  const res = await request(app)
    .get(`/api/users?collegeId=${fx.collegeB.id}&role=USER`)
    .set("Cookie", cookies.adminA);
  assert.strictEqual(res.status, 200);
  const ids = res.body.data.users.map((u) => u.id);
  assert.ok(!ids.includes(fx.studentB.id));
  assert.ok(ids.includes(fx.studentA.id));
});