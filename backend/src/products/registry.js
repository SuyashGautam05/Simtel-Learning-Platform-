/**
 * Product content adapter registry.
 * -----------------------------------------------------------------------
 * This is the ONE seam between the core platform and each module's actual
 * implementation (theory pages, simulations, experiments, quizzes,
 * projects). The core platform — routes, controllers, RBAC, product-key
 * gating — never imports a module's content code directly. It only ever
 * calls `getAdapter(code)` and invokes whatever that adapter exposes.
 *
 * To plug in a real simulation app for a module:
 *   1. Build the app however makes sense for that module (its own routes,
 *      its own storage, even a separate service reached over HTTP).
 *   2. Write a thin adapter here (see adapters/plc.adapter.js for the
 *      shape) that translates the platform's generic
 *      "give me this section's content" calls into that app's real API.
 *   3. registerAdapter("YOUR_CODE", yourAdapter) in this file.
 * Nothing in routes/controllers/middleware changes when you do this.
 *
 * A module with no registered adapter still works — requests for its
 * content resolve through the fallback adapter, which returns a
 * "coming soon" placeholder instead of erroring, so the catalog/library
 * UI can list a module before its content is actually built.
 * -----------------------------------------------------------------------
 */

const SECTIONS = ["theory", "topics", "simulations", "experiments", "quizzes", "projects"];

const adapters = new Map();

function registerAdapter(productCode, adapter) {
  const missing = SECTIONS.filter((section) => typeof adapter[section] !== "function");
  if (missing.length > 0) {
    throw new Error(
      `Adapter for "${productCode}" is missing handlers for: ${missing.join(", ")}`
    );
  }
  adapters.set(productCode.toUpperCase(), adapter);
}

const fallbackAdapter = Object.fromEntries(
  SECTIONS.map((section) => [
    section,
    async ({ productCode }) => ({
      available: false,
      section,
      productCode,
      message: `${section[0].toUpperCase()}${section.slice(1)} content for this module hasn't been built yet.`,
    }),
  ])
);

function getAdapter(productCode) {
  return adapters.get(productCode.toUpperCase()) || fallbackAdapter;
}

function hasAdapter(productCode) {
  return adapters.has(productCode.toUpperCase());
}

module.exports = { registerAdapter, getAdapter, hasAdapter, SECTIONS };