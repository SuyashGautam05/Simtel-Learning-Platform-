const prisma = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../utils/jwt");
const { ApiError } = require("../utils/apiResponse");

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function login({ email, password, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new ApiError(401, "Invalid email or password");
  if (user.status !== "ACTIVE") throw new ApiError(403, "Account is not active");

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) throw new ApiError(401, "Invalid email or password");

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
  if (!user || user.status !== "ACTIVE") {
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

async function logout({ refreshToken }) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken
    .update({ where: { tokenHash }, data: { revoked: true } })
    .catch(() => null); // idempotent — ignore if already gone
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = { login, refresh, logout, hashPassword };
