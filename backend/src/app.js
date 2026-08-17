const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

// Registers every module's content adapter (see src/products/registry.js
// and src/products/index.js). Must run before any request hits the
// generic /api/products/:code/content/:section dispatcher.
require("./products");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/health", (req, res) => res.json({ status: "ok", service: "simtel-backend" }));

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
