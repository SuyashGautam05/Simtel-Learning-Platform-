const request = require("supertest");
const assert = require("node:assert/strict");

/**
 * Logs in as the given user and returns the Set-Cookie header array so it
 * can be replayed on subsequent supertest requests via .set("Cookie", ...).
 */
async function loginAs(app, email, password) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  assert.strictEqual(
    res.status,
    200,
    `Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`
  );
  const cookies = res.headers["set-cookie"];
  assert.ok(cookies && cookies.length > 0, `No cookies returned for ${email}`);
  return cookies;
}

module.exports = { loginAs };