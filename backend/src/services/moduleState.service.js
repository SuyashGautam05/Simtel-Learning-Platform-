const prisma = require("../config/db");

/**
 * saveState / loadState
 * -----------------------------------------------------------------------
 * The platform's entire involvement in "saving/loading simulation state"
 * (a module responsibility per the integration architecture) is acting
 * as opaque JSON storage keyed by (userId, productId). Whatever the
 * module sends in `data` is stored and returned byte-for-byte — no
 * schema, no interpretation, no validation of its internal shape. This
 * is what lets the platform support a Canvas-based PLC simulator and a
 * Three.js-based circuit simulator with the same two endpoints, without
 * knowing anything about ladder logic or circuit graphs.
 * -----------------------------------------------------------------------
 */
async function saveState(userId, productId, data) {
  const record = await prisma.moduleSimulationState.upsert({
    where: { userId_productId: { userId, productId } },
    update: { data },
    create: { userId, productId, data },
  });
  return { updatedAt: record.updatedAt };
}

async function loadState(userId, productId) {
  const record = await prisma.moduleSimulationState.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!record) return { data: null, updatedAt: null };
  return { data: record.data, updatedAt: record.updatedAt };
}

module.exports = { saveState, loadState };