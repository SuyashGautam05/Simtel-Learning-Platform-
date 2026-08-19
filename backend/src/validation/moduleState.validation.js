const { z } = require("zod");

// The platform doesn't validate the shape of `data` (see moduleState
// service comments) — only that it's a plain JSON-serializable object
// and stays under a sane size cap, so one module can't abuse this as
// unbounded blob storage.
const MAX_STATE_BYTES = 256 * 1024; // 256KB

const saveStateSchema = z.object({
  data: z.record(z.any()).refine(
    (val) => Buffer.byteLength(JSON.stringify(val), "utf8") <= MAX_STATE_BYTES,
    { message: `Saved state must be under ${MAX_STATE_BYTES / 1024}KB` }
  ),
});

module.exports = { saveStateSchema, MAX_STATE_BYTES };