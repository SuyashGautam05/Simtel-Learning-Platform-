const { ZodError } = require("zod");
const { ApiError } = require("../utils/apiResponse");

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Any validation schema that reaches here unhandled is a client input
  // problem, not a server fault — always 400, never 500.
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  // SECURITY: an unexpected (non-ApiError) failure — a Prisma error, a
  // bug, anything not deliberately thrown as a client-facing ApiError —
  // must NEVER have its raw err.message sent to the client, in any
  // environment. That message can contain table/column names, query
  // fragments, file paths, or other implementation details a real
  // attacker can use to map the system. Every 500 gets the same generic
  // message; the real error is only ever logged server-side.
  //
  // A deliberately-thrown ApiError is different: its message was written
  // by us specifically to be shown to the caller (e.g. "Invalid product
  // key"), so it's safe to pass through as-is.
  const message = err instanceof ApiError ? err.message : "Internal server error";

  if (statusCode === 500) {
    // Always logged server-side, in every environment — silently
    // swallowing unexpected errors in production (as the previous
    // dev-only console.error did) makes incidents invisible.
    // eslint-disable-next-line no-console
    console.error("[unhandled error]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err instanceof ApiError ? err.details : undefined,
  });
}

module.exports = { notFoundHandler, errorHandler };