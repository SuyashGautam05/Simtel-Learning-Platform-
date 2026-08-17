const prisma = require("../config/db");

/**
 * getMyProducts(user)
 * The single source of truth for "what can this user actually open right
 * now." Powers GET /api/my-products. SUPER_ADMIN gets every ACTIVE
 * product (platform-owner visibility); everyone else gets only products
 * backed by a currently-valid UserProductAccess row.
 */
async function getMyProducts(user) {
  if (user.role === "SUPER_ADMIN") {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: { name: "asc" },
    });
    return products.map((p) => ({ ...stripInternal(p), unlocked: true, expiresAt: null }));
  }

  const access = await prisma.userProductAccess.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { product: true },
    orderBy: { activatedAt: "desc" },
  });

  return access
    .filter((a) => a.product && a.product.status === "ACTIVE" && !a.product.deletedAt)
    .map((a) => ({ ...stripInternal(a.product), unlocked: true, expiresAt: a.expiresAt, activatedAt: a.activatedAt }));
}

function isAccessValid(access) {
  return !!access && access.status === "ACTIVE" && (!access.expiresAt || access.expiresAt > new Date());
}

async function getUserProductAccess(userId, productId) {
  return prisma.userProductAccess.findUnique({
    where: { userId_productId: { userId, productId } },
  });
}

/**
 * hasProductAccess(userId, productId)
 * Reused by the moduleAccess middleware so there is exactly one
 * implementation of "does this user have a currently-valid grant for
 * this product," rather than the check being duplicated (and potentially
 * drifting) between /my-products and the content-gating middleware.
 */
async function hasProductAccess(userId, productId) {
  return isAccessValid(await getUserProductAccess(userId, productId));
}

function stripInternal(product) {
  const { metadata, deletedAt, ...safe } = product;
  return safe;
}

module.exports = { getMyProducts, hasProductAccess, getUserProductAccess, isAccessValid };