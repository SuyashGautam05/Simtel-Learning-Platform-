const authService = require("../services/auth.service");
const { registerSchema, loginSchema, changePasswordSchema } = require("../validation/auth.validation");
const { ok } = require("../utils/apiResponse");

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: maxAgeMs,
  path: "/",
});

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookies(res, { accessToken, refreshToken }) {
  res
    .cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS))
    .cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

async function register(req, res, next) {
  try {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(input);
    return ok(res, { user }, "Account created. You can now log in.", 201);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await authService.login({
      email,
      password,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      req,
    });

    setAuthCookies(res, result);
    return ok(res, { user: result.user }, "Login successful");
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh({
      refreshToken: req.cookies?.refreshToken,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    setAuthCookies(res, result);
    return ok(res, { user: result.user }, "Token refreshed");
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout({
      refreshToken: req.cookies?.refreshToken,
      req,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res
      .clearCookie("accessToken", { path: "/" })
      .clearCookie("refreshToken", { path: "/" });
    return ok(res, null, "Logged out");
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    return ok(res, { user: req.user });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
      req,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return ok(res, null, "Password changed. Please log in again on other devices.");
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me, changePassword };