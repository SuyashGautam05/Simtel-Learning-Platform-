const productService = require("../services/product.service");
const {
  createProductSchema,
  updateProductSchema,
  setStatusSchema,
  listProductsQuerySchema,
} = require("../validation/product.validation");
const { ok } = require("../utils/apiResponse");

async function list(req, res, next) {
  try {
    const filters = listProductsQuerySchema.parse(req.query);
    // licensedOnly/unlockedOnly are plain boolean query flags, not part of
    // the strict schema above (kept separate so ADMIN/USER-only flags
    // don't need to be threaded through a shared status/includeAll schema).
    filters.licensedOnly = req.query.licensedOnly === "true";
    filters.unlockedOnly = req.query.unlockedOnly === "true";

    const products = await productService.listProducts(req.user, filters);
    return ok(res, { products });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await productService.getProduct(req.user, req.params.id);
    return ok(res, { product });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await productService.createProduct(req.user, input);
    return ok(res, { product }, "Module created", 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const input = updateProductSchema.parse(req.body);
    const product = await productService.updateProduct(req.user, req.params.id, input);
    return ok(res, { product }, "Module updated");
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const { status } = setStatusSchema.parse(req.body);
    const product = await productService.setProductStatus(req.user, req.params.id, status);
    return ok(res, { product }, `Module status set to ${status}`);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const product = await productService.archiveProduct(req.user, req.params.id);
    return ok(res, { product }, "Module archived");
  } catch (err) {
    next(err);
  }
}

async function stats(req, res, next) {
  try {
    const data = await productService.getProductStats(req.user, req.params.id);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, setStatus, remove, stats };