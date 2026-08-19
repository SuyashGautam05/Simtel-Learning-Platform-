const productKeyService = require("../services/productKey.service");
const { activateProductKey } = require("../services/activation.service");
const {
  generateKeysSchema,
  listKeysQuerySchema,
  activateKeySchema,
} = require("../validation/productKey.validation");
const { ok } = require("../utils/apiResponse");

async function generate(req, res, next) {
  try {
    const input = generateKeysSchema.parse(req.body);
    const keys = await productKeyService.generateKeys(req.user, input, req);
    return ok(
      res,
      { keys },
      "Product keys generated. Save these now — raw key values are never shown again.",
      201
    );
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const filters = listKeysQuerySchema.parse(req.query);
    const result = await productKeyService.listKeys(req.user, filters);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const key = await productKeyService.getKey(req.user, req.params.id);
    return ok(res, { key });
  } catch (err) {
    next(err);
  }
}

async function revoke(req, res, next) {
  try {
    const key = await productKeyService.revokeKey(req.user, req.params.id, req);
    return ok(res, { key }, "Product key revoked");
  } catch (err) {
    next(err);
  }
}

async function reactivate(req, res, next) {
  try {
    const key = await productKeyService.reactivateKey(req.user, req.params.id, req);
    return ok(res, { key }, "Product key reactivated");
  } catch (err) {
    next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const filters = listKeysQuerySchema.parse(req.query);
    const csv = await productKeyService.exportKeys(req.user, filters, req);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="product-keys-${Date.now()}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/product-keys/activate
 * The only field ever read from the body is `key` (activateKeySchema
 * strips anything else, including any attempted `productId`). The
 * product is derived entirely from the key server-side.
 */
async function activate(req, res, next) {
  try {
    const { key } = activateKeySchema.parse(req.body);
    const result = await activateProductKey(req.user, key, req);

    const message = result.alreadyActivated
      ? "You already have access to this module"
      : "Module unlocked successfully";

    return ok(
      res,
      {
        product: {
          id: result.product.id,
          code: result.product.code,
          name: result.product.name,
          description: result.product.description,
        },
        access: {
          status: result.access.status,
          activatedAt: result.access.activatedAt,
          expiresAt: result.access.expiresAt,
        },
      },
      message,
      result.alreadyActivated ? 200 : 201
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { generate, list, getOne, revoke, reactivate, exportCsv, activate };