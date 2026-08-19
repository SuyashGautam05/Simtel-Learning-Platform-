const prisma = require("../config/db");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");
const { AUDIT_ACTIONS } = require("../constants/auditActions");

/**
 * Strips fields a caller isn't entitled to see. `metadata` can carry
 * integration details (adapter config, internal URLs) that are nobody's
 * business but the platform owner's — ADMIN and USER never receive it,
 * regardless of how they reach this data.
 */
function sanitizeProduct(product, { role, unlocked } = {}) {
  const { metadata, deletedAt, ...safe } = product;
  const result = role === "SUPER_ADMIN" ? { ...safe, metadata, deletedAt } : safe;
  if (typeof unlocked === "boolean") result.unlocked = unlocked;
  return result;
}

// ---------------------------------------------------------------------------
// LIST
// SUPER_ADMIN: every product, any status (optionally filtered), including
//   archived/draft — this is the admin management view.
// ADMIN: ACTIVE products only by default; ?licensedOnly=true narrows to
//   products their college holds a CollegeProductLicense for.
// USER: ACTIVE products only, each annotated with `unlocked` based on
//   their own UserProductAccess — never DRAFT/INACTIVE/ARCHIVED, which
//   don't exist as far as a student is concerned.
// ---------------------------------------------------------------------------
async function listProducts(requester, filters = {}) {
  if (requester.role === "SUPER_ADMIN") {
    const where = {};
    if (filters.status) {
      where.status = filters.status;
    } else if (!filters.includeAll) {
      // Default admin view hides archived clutter unless asked for.
      where.status = { not: "ARCHIVED" };
    }
    const products = await prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
    return products.map((p) => sanitizeProduct(p, { role: requester.role }));
  }

  if (requester.role === "ADMIN") {
    if (filters.licensedOnly) {
      const licenses = await prisma.collegeProductLicense.findMany({
        where: { collegeId: requester.collegeId, status: "ACTIVE" },
        include: { product: true },
      });
      return licenses
        .filter((l) => l.product.status === "ACTIVE" && !l.product.deletedAt)
        .map((l) => sanitizeProduct(l.product, { role: requester.role }));
    }
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: { name: "asc" },
    });
    return products.map((p) => sanitizeProduct(p, { role: requester.role }));
  }

  // USER
  const [products, access] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.userProductAccess.findMany({
      where: {
        userId: requester.id,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { productId: true },
    }),
  ]);
  const unlockedIds = new Set(access.map((a) => a.productId));
  let result = products.map((p) =>
    sanitizeProduct(p, { role: requester.role, unlocked: unlockedIds.has(p.id) })
  );
  if (filters.unlockedOnly) {
    result = result.filter((p) => p.unlocked);
  }
  return result;
}

// ---------------------------------------------------------------------------
// GET ONE
// ---------------------------------------------------------------------------
async function getProduct(requester, id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, "Module not found");

  if (requester.role === "SUPER_ADMIN") {
    return sanitizeProduct(product, { role: requester.role });
  }

  // ADMIN/USER: a non-ACTIVE module doesn't exist for them — 404, not 403,
  // so draft/archived module names/ids aren't confirmable by probing IDs.
  if (product.status !== "ACTIVE" || product.deletedAt) {
    throw new ApiError(404, "Module not found");
  }

  if (requester.role === "USER") {
    const access = await prisma.userProductAccess.findUnique({
      where: { userId_productId: { userId: requester.id, productId: product.id } },
    });
    const unlocked =
      !!access &&
      access.status === "ACTIVE" &&
      (!access.expiresAt || access.expiresAt > new Date());
    return sanitizeProduct(product, { role: requester.role, unlocked });
  }

  return sanitizeProduct(product, { role: requester.role });
}

// ---------------------------------------------------------------------------
// CREATE (SUPER_ADMIN only — enforced at the route)
// ---------------------------------------------------------------------------
async function createProduct(requester, input, req) {
  const existing = await prisma.product.findUnique({ where: { code: input.code } });
  if (existing) throw new ApiError(409, "A module with this code already exists");

  const product = await prisma.product.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      version: input.version ?? "1.0.0",
      thumbnailUrl: input.thumbnailUrl,
      metadata: input.metadata ?? {},
      status: input.status ?? "DRAFT",
    },
  });

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_CREATED,
    targetType: "Product",
    targetId: product.id,
    metadata: { code: product.code, name: product.name },
    req,
  });

  return sanitizeProduct(product, { role: requester.role });
}

// ---------------------------------------------------------------------------
// UPDATE (SUPER_ADMIN only)
// ---------------------------------------------------------------------------
async function updateProduct(requester, id, input, req) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Module not found");

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      version: input.version ?? undefined,
      thumbnailUrl: input.thumbnailUrl ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });

  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_UPDATED,
    targetType: "Product",
    targetId: product.id,
    metadata: { changes: Object.keys(input) },
    req,
  });

  return sanitizeProduct(product, { role: requester.role });
}

// ---------------------------------------------------------------------------
// SET STATUS (SUPER_ADMIN only) — activate / deactivate / archive / draft
// ---------------------------------------------------------------------------
async function setProductStatus(requester, id, status, req) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Module not found");

  const product = await prisma.product.update({
    where: { id },
    data: {
      status,
      deletedAt: status === "ARCHIVED" ? new Date() : null,
    },
  });

  // Status transitions (activate/deactivate/archive) are all reported as
  // PRODUCT_UPDATED — the specific transition is in metadata.from/to, no
  // separate action name per status per the required action list.
  await writeAuditLog({
    actor: requester,
    action: AUDIT_ACTIONS.PRODUCT_UPDATED,
    targetType: "Product",
    targetId: product.id,
    metadata: { from: existing.status, to: status },
    req,
  });

  return sanitizeProduct(product, { role: requester.role });
}

// ---------------------------------------------------------------------------
// ARCHIVE (the DELETE endpoint) — soft delete, never hard delete.
// Existing ProductKey/UserProductAccess rows are left exactly as they are:
// a college that already paid for seats doesn't lose them because the
// module was retired from the catalog. It just stops being
// discoverable/assignable going forward.
// ---------------------------------------------------------------------------
async function archiveProduct(requester, id, req) {
  return setProductStatus(requester, id, "ARCHIVED", req);
}

// ---------------------------------------------------------------------------
// STATS (SUPER_ADMIN only)
// ---------------------------------------------------------------------------
async function getProductStats(requester, id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, "Module not found");

  const [totalKeys, activatedKeys, activeAccessGrants, licenses] = await Promise.all([
    prisma.productKey.count({ where: { productId: id } }),
    prisma.productKey.count({ where: { productId: id, activationsCount: { gt: 0 } } }),
    prisma.userProductAccess.count({ where: { productId: id, status: "ACTIVE" } }),
    prisma.collegeProductLicense.findMany({ where: { productId: id } }),
  ]);

  const seatTotals = licenses.reduce(
    (acc, l) => ({
      totalSeats: acc.totalSeats + l.totalSeats,
      usedSeats: acc.usedSeats + l.usedSeats,
    }),
    { totalSeats: 0, usedSeats: 0 }
  );

  return {
    productId: id,
    code: product.code,
    name: product.name,
    status: product.status,
    totalKeysGenerated: totalKeys,
    keysActivated: activatedKeys,
    activeAccessGrants,
    collegeLicenseCount: licenses.length,
    ...seatTotals,
  };
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  setProductStatus,
  archiveProduct,
  getProductStats,
  sanitizeProduct,
};