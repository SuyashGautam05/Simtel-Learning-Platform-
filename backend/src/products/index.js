/**
 * Registers every module's content adapter. Imported once, at app
 * startup, from app.js. Adding module #16's adapter is: write the file
 * in adapters/, add one line here. No route/controller changes.
 */
const { registerAdapter } = require("./registry");

registerAdapter("PLC", require("./adapters/plc.adapter"));

// Future modules plug in the same way, e.g.:
// registerAdapter("ELEC", require("./adapters/electrical.adapter"));
// registerAdapter("EMB", require("./adapters/embedded.adapter"));
// Modules without a line here still work — they resolve through the
// registry's fallback adapter (see registry.js) until their real
// content is ready.

module.exports = {};