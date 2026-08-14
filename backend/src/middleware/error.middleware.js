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
  const message = err.message || "Internal server error";

  if (process.env.NODE_ENV === "development" && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err instanceof ApiError ? err.details : undefined,
  });
}

module.exports = { notFoundHandler, errorHandler };