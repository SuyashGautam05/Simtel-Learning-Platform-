const prisma = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../utils/jwt");
const { ApiError } = require("../utils/apiResponse");
const loginAttempts = require("../utils/loginAttempts");

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// REGISTER
// Public self-registration always creates a USER account — role and
// collegeId assignment beyond this are admin-only actions handled elsewhere.
// ---------------------------------------------------------------------------
async function register({ name, email, password, collegeCode }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Registration is not treated as a "sensitive" flow the way login is —
    // the person is trying to create an account, so confirming "this email
    // is already registered, try logging in instead" is standard and useful.
    throw new ApiError(409, "An account with this email already exists");
  }

  let collegeId = null;
  if (collegeCode) {
    const college = await prisma.college.findUnique({ where: { code: collegeCode } });
    if (!college || college.status !== "ACTIVE" || college.deletedAt) {
      throw new ApiError(400, "Invalid college code");
    }
    collegeId = college.id;
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
      collegeId,
    },
  });

  return sanitizeUser(user);
}

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
async function login({ email, password, userAgent, ipAddress }) {
  if (loginAttempts.isLocked(email)) {
    const minutes = Math.ceil(loginAttempts.getLockRemainingMs(email) / 60000);
    throw new ApiError(
      429,
      `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Generic error for both "no such user" and "wrong password" — never
  // reveal which one it was, so an attacker can't enumerate valid emails.
  const genericFailure = () => {
    loginAttempts.recordFailure(email);
    throw new ApiError(401, "Invalid email or password");
  };

  if (!user || user.deletedAt) return genericFailure();

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) return genericFailure();

  // Password was correct — now it's safe to reveal account-status detail,
  // since the person has already proven they know the credentials.
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "Your account is not active. Contact your administrator.");
  }

  loginAttempts.reset(email);

  const tokens = await issueTokens(user, { userAgent, ipAddress });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

async function issueTokens(user, { userAgent, ipAddress } = {}) {
  const payload = { sub: user.id, role: user.role };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent,
      ipAddress,
    },
  });

  return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// REFRESH (rotating refresh tokens)
// ---------------------------------------------------------------------------
async function refresh({ refreshToken, userAgent, ipAddress }) {
  if (!refreshToken) throw new ApiError(401, "Refresh token missing");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token is no longer valid");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== "ACTIVE" || user.deletedAt) {
    throw new ApiError(401, "Account is not active");
  }

  // Rotate: revoke the used refresh token, issue a brand new pair.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const tokens = await issueTokens(user, { userAgent, ipAddress });
  return { user: sanitizeUser(user), ...tokens };
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
async function logout({ refreshToken }) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken
    .update({ where: { tokenHash }, data: { revoked: true } })
    .catch(() => null); // idempotent — ignore if already gone
}

// ---------------------------------------------------------------------------
// CHANGE PASSWORD
// ---------------------------------------------------------------------------
async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw new ApiError(404, "User not found");

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) throw new ApiError(401, "Current password is incorrect");

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Changing a password invalidates every existing session (defense in
  // depth in case the password change was prompted by a compromise).
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { register, login, refresh, logout, changePassword, sanitizeUser };