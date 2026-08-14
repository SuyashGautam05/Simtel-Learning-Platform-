const { z } = require("zod");
const authService = require("../services/auth.service");
const { ok } = require("../utils/apiResponse");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: maxAgeMs,
  path: "/",
});

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await authService.login({
      email,
      password,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });

    res
      .cookie("accessToken", result.accessToken, cookieOptions(15 * 60 * 1000))
      .cookie("refreshToken", result.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))
      .json({ success: true, message: "Login successful", data: { user: result.user } });
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

    res
      .cookie("accessToken", result.accessToken, cookieOptions(15 * 60 * 1000))
      .cookie("refreshToken", result.refreshToken, cookieOptions(7 * 24 * 60 * 60 * 1000))
      .json({ success: true, message: "Token refreshed", data: { user: result.user } });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout({ refreshToken: req.cookies?.refreshToken });
    res
      .clearCookie("accessToken", { path: "/" })
      .clearCookie("refreshToken", { path: "/" })
      .json({ success: true, message: "Logged out" });
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

module.exports = { login, refresh, logout, me };
