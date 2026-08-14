/**
 * Lightweight in-memory brute-force tracker, keyed by email.
 * Complements the IP-based express-rate-limit on /auth/login: this catches
 * a single attacker rotating IPs against one account, at the cost of not
 * being shared across multiple server instances. For a multi-instance
 * production deployment, swap this Map for a Redis-backed counter with the
 * same interface (recordFailure / isLocked / reset).
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // failures older than this don't count

const attempts = new Map(); // email -> { count, firstFailureAt, lockedUntil }

function isLocked(email) {
  const entry = attempts.get(email.toLowerCase());
  if (!entry?.lockedUntil) return false;
  if (entry.lockedUntil <= Date.now()) {
    attempts.delete(email.toLowerCase());
    return false;
  }
  return true;
}

function getLockRemainingMs(email) {
  const entry = attempts.get(email.toLowerCase());
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, entry.lockedUntil - Date.now());
}

function recordFailure(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstFailureAt > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstFailureAt: now, lockedUntil: null });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
}

function reset(email) {
  attempts.delete(email.toLowerCase());
}

// Periodic cleanup so the Map doesn't grow unbounded in a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    const stale = !entry.lockedUntil && now - entry.firstFailureAt > ATTEMPT_WINDOW_MS;
    const expiredLock = entry.lockedUntil && entry.lockedUntil <= now;
    if (stale || expiredLock) attempts.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = { isLocked, getLockRemainingMs, recordFailure, reset };