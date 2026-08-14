class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function ok(res, data = null, message = "Success", statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function fail(res, statusCode = 500, message = "Something went wrong", details = null) {
  return res.status(statusCode).json({ success: false, message, details });
}

module.exports = { ApiError, ok, fail };
