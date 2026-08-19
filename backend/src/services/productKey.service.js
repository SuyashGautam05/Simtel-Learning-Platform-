const prisma = require("../config/db");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");
const { AUDIT_ACTIONS } = require("../constants/auditActions");
const { generateProductKey, hashProductKey, lastFour, maskedKey } = require("../utils/productKeyCrypto");

/**
 * Shapes a ProductKey row for API responses. The raw key is never
 * available after generation (we never stored it), so every response
 * from here on shows only the masked form.
 */
function toPublicKey(key, product) {
  return {
    id: key.id,
    maskedKey: maskedKey(product?.code ?? key.productCode, key.keyLastFour),
    status: key.status,
    productId: key.productId,
    productCode: product?.code,
    productName: product?.name,
    collegeId: key.collegeId,
    maxActivations: key.maxActivations,
    activationsCount: key.activationsCount,
    activationRules: key.activationRules,
    expiresAt: key.expiresAt,
    activatedAt: key.activatedAt,
    activatedByUserId: key.activatedByUserId,
    generatedByUserId: key.generatedByUserId,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

/**
 * generateKeys — SUPER_ADMIN only (enforced at the route).
 * The raw key string is returned ONLY in this response, exactly once.
 * It is never persisted, logged, or retrievable again after this call
 * returns — if it's lost, the only remedy is revoking and generating a
 * replacement.
 */
async function generateKeys(requester, input, req) {
  const product = await prisma.product.findUnique({ where: { code: input.productCode } });
  if (!product || product.deletedAt) {
    throw new ApiError(404, `No module found with code "${input.productCode}"`);
  }

  if (input.collegeId) {
    const college = await prisma.college.findUnique({ where: { id: input.collegeId } });
    if (!college || college.deletedAt) throw new ApiError(400, "Invalid collegeId");
  }

  const generated = [];
  for (let i = 0; i < input.quantity; i++) {
    const rawKey = generateProductKey(product.code);
    generated.push({
      rawKey,
      keyHash: hashProductKey(rawKey),
      keyLastFour: lastFour(rawKey),
    });
  }

  const created = await prisma.$transaction(
    generated.map((g) =>
      prisma.productKey.create({
        data: {
          keyHash: g.keyHash,
          keyLastFour: g.keyLastFour,
          productId: product.id,
          collegeId: input.collegeId || null,
          maxActivations: input.maxActivations,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          activationRules: input.activationRules ?? {},
          generatedByUserId: requester.id,
        },
      })
    )
  );

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_KEY_GENERATED,
    targetType: "Product",
    targetId: product.id,
    metadata: { productCode: product.code, quantity: input.quantity, collegeId: input.collegeId },
    req,
  });

  // The one and only place raw keys are ever returned.
  return created.map((key, i) => ({
    ...toPublicKey(key, product),
    key: generated[i].rawKey,
  }));
}

/**
 * listKeys — SUPER_ADMIN only. Search is necessarily limited to fields
 * we actually store (status, product, college, last-4) — the raw key
 * itself was never persisted, so substring search against the secret is
 * not just disallowed, it's structurally impossible.
 */
async function listKeys(requester, filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.collegeId) where.collegeId = filters.collegeId;
  if (filters.lastFour) where.keyLastFour = filters.lastFour.toUpperCase();
  if (filters.productCode) {
    const product = await prisma.product.findUnique({ where: { code: filters.productCode } });
    where.productId = product ? product.id : "__none__"; // no match if code doesn't exist
  }

  const [keys, total] = await Promise.all([
    prisma.productKey.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.productKey.count({ where }),
  ]);

  return {
    keys: keys.map((k) => toPublicKey(k, k.product)),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

async function getKey(requester, id) {
  const key = await prisma.productKey.findUnique({ where: { id }, include: { product: true } });
  if (!key) throw new ApiError(404, "Product key not found");
  return toPublicKey(key, key.product);
}

/**
 * revokeKey — permanently invalidates a key. Does NOT revoke access
 * already granted through it (that's a separate, explicit action via
 * POST /api/admin/product-access/revoke) — revoking a key stops it from
 * being used again, it doesn't retroactively punish someone who already
 * activated it legitimately.
 */
async function revokeKey(requester, id, req) {
  const existing = await prisma.productKey.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Product key not found");

  const key = await prisma.productKey.update({
    where: { id },
    data: { status: "REVOKED" },
    include: { product: true },
  });

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_KEY_REVOKED,
    targetType: "ProductKey",
    targetId: key.id,
    metadata: { productCode: key.product.code, previousStatus: existing.status },
    req,
  });

  return toPublicKey(key, key.product);
}

/**
 * reactivateKey — undoes an accidental revoke. Only valid for a key that
 * was REVOKED before ever being activated (activationsCount === 0) — a
 * key that had already been used and was then revoked for cause should
 * not be quietly un-revoked; generate a fresh key instead.
 */
async function reactivateKey(requester, id, req) {
  const existing = await prisma.productKey.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Product key not found");
  if (existing.status !== "REVOKED") {
    throw new ApiError(400, "Only a revoked key can be reactivated");
  }
  if (existing.activationsCount > 0) {
    throw new ApiError(
      400,
      "This key was already activated before being revoked — generate a new key instead of reactivating it"
    );
  }

  const key = await prisma.productKey.update({
    where: { id },
    data: { status: "UNUSED" },
    include: { product: true },
  });

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_KEY_REACTIVATED,
    targetType: "ProductKey",
    targetId: key.id,
    metadata: { productCode: key.product.code },
    req,
  });

  return toPublicKey(key, key.product);
}

/**
 * exportKeys — SUPER_ADMIN only. CSV of masked keys + metadata. Never
 * includes a raw key (we don't have them), so this is safe to hand to
 * finance/ops without it being a credential leak on its own.
 */
async function exportKeys(requester, filters, req) {
  const { keys } = await listKeys(requester, { ...filters, page: 1, pageSize: 10000 });

  const header = [
    "id",
    "maskedKey",
    "status",
    "productCode",
    "collegeId",
    "maxActivations",
    "activationsCount",
    "expiresAt",
    "activatedAt",
    "createdAt",
  ];
  const rows = keys.map((k) =>
    [
      k.id,
      k.maskedKey,
      k.status,
      k.productCode,
      k.collegeId ?? "",
      k.maxActivations,
      k.activationsCount,
      k.expiresAt ?? "",
      k.activatedAt ?? "",
      k.createdAt,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_KEY_EXPORTED,
    targetType: "ProductKey",
    metadata: { count: keys.length, filters },
    req,
  });

  return [header.join(","), ...rows].join("\n");
}

module.exports = { generateKeys, listKeys, getKey, revokeKey, reactivateKey, exportKeys, toPublicKey };