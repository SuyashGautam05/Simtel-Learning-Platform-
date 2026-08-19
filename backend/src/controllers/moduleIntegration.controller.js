const { buildLaunchPayload } = require("../services/moduleLaunch.service");
const moduleStateService = require("../services/moduleState.service");
const { saveStateSchema } = require("../validation/moduleState.validation");
const { ApiError, ok } = require("../utils/apiResponse");

/**
 * GET /api/products/:productId/launch
 * Gated by requireProductAccess() at the route — by the time this runs,
 * authorization is already confirmed. This handler only assembles the
 * platform → module handoff payload.
 */
async function launch(req, res, next) {
  try {
    const { product } = req.productAccess;

    if (product.integrationType !== "IFRAME" || !product.entryPointUrl) {
      throw new ApiError(
        409,
        "This module doesn't have an interactive simulator configured yet."
      );
    }

    const payload = buildLaunchPayload({ user: req.user, product });
    return ok(res, payload);
  } catch (err) {
    next(err);
  }
}

async function getState(req, res, next) {
  try {
    const { product } = req.productAccess;
    const state = await moduleStateService.loadState(req.user.id, product.id);
    return ok(res, state);
  } catch (err) {
    next(err);
  }
}

async function putState(req, res, next) {
  try {
    const { data } = saveStateSchema.parse(req.body);
    const { product } = req.productAccess;
    const result = await moduleStateService.saveState(req.user.id, product.id, data);
    return ok(res, result, "State saved");
  } catch (err) {
    next(err);
  }
}

module.exports = { launch, getState, putState };