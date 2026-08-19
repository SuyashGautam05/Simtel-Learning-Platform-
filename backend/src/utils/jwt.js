const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    jwtid: crypto.randomUUID(),
  });
}

function signRefreshToken(payload) {
  // A random jti guarantees the signed token string is unique even when
  // the same user logs in twice within the same second — jsonwebtoken's
  // `iat` claim only has second-level precision, so without this, two
  // rapid logins produce a byte-identical JWT, and since refresh tokens
  // are stored by their SHA-256 hash under a unique constraint
  // (RefreshToken.tokenHash), that identical token collides on insert.
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    jwtid: crypto.randomUUID(),
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Refresh tokens are stored server-side only as a hash (never plaintext),
// so a stolen DB dump alone can't be replayed as a session.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
