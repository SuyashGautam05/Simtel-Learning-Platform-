const prisma = require("../config/db");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");
const { hashProductKey } = require("../utils/productKeyCrypto");

/**
 * Evaluates ProductKey.activationRules (free-form JSON) against the
 * activating user. Unknown rule keys are ignored — new rule types can be
 * added here without a schema migration or breaking older keys that
 * don't set them.
 */
function checkActivationRules(rules, user) {
  if (!rules || typeof rules !== "object") return;

  if (rules.allowedEmailDomain) {
    const domain = String(rules.allowedEmailDomain).toLowerCase();
    if (!user.email.toLowerCase().endsWith(`@${domain}`)) {
      throw new ApiError(403, `This key can only be activated by @${domain} accounts`);
    }
  }

  if (rules.requireCollegeId) {
    if (user.collegeId !== rules.requireCollegeId) {
      throw new ApiError(403, "This key is restricted to a specific college and your account doesn't match it");
    }
  }
}

/**
 * activateProductKey(user, rawKey)
 * -----------------------------------------------------------------------
 * The security-critical path. Every step below maps to the 10 numbered
 * requirements from the spec:
 *   1. Authenticate user       — done by requireAuth before this runs
 *   2. Validate the key        — hash lookup; unknown hash → 404
 *   3. Check key status        — REVOKED / EXHAUSTED rejected
 *   4. Check expiration        — expiresAt vs now, flips status to EXPIRED
 *   5. Determine the product   — ALWAYS from key.productId, never from
 *                                 any client-supplied field (there isn't
 *                                 one — activateKeySchema only accepts
 *                                 `key`)
 *   6. Create user-product authorization — upsert UserProductAccess
 *   7. Prevent duplicate activation       — see duplicate-access check
 *   8. Return the authorized product      — response payload
 *   9. Record activation time             — activatedAt timestamps
 *  10. Record audit information           — writeAuditLog
 * -----------------------------------------------------------------------
 */
async function activateProductKey(user, rawKey) {
  const keyHash = hashProductKey(rawKey);

  // Step 2: validate the key exists at all. Generic message — we don't
  // distinguish "malformed" from "well-formed but unknown" so a brute
  // force attempt learns nothing from the response.
  const key = await prisma.productKey.findUnique({
    where: { keyHash },
    include: { product: true },
  });
  if (!key) {
    throw new ApiError(404, "Invalid product key");
  }

  // Step 3: status checks.
  if (key.status === "REVOKED") {
    throw new ApiError(403, "This product key has been revoked");
  }

  // Step 4: expiration — evaluated against real time, not just the
  // stored status, so a key that expired since it was last touched is
  // still caught even if a background job hasn't swept it yet.
  if (key.expiresAt && key.expiresAt <= new Date()) {
    if (key.status !== "EXPIRED") {
      await prisma.productKey.update({ where: { id: key.id }, data: { status: "EXPIRED" } });
    }
    throw new ApiError(410, "This product key has expired");
  }

  if (key.activationsCount >= key.maxActivations) {
    if (key.status !== "EXHAUSTED") {
      await prisma.productKey.update({ where: { id: key.id }, data: { status: "EXHAUSTED" } });
    }
    throw new ApiError(409, "This product key has already been used and has no remaining activations");
  }

  // Step 5: the product is whatever this key points to. There is no
  // other source of truth — the request body has no productId field to
  // even try to trust (see activateKeySchema).
  const product = key.product;
  if (!product || product.deletedAt || product.status === "ARCHIVED") {
    throw new ApiError(404, "The module this key belongs to is no longer available");
  }

  checkActivationRules(key.activationRules, user);

  // Step 7: duplicate-activation handling.
  const existingAccess = await prisma.userProductAccess.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
  });

  if (existingAccess && existingAccess.status === "ACTIVE") {
    if (existingAccess.productKeyId === key.id) {
      // Same user, same key, resubmitted — idempotent success rather
      // than an error, since nothing is actually wrong.
      return { product, access: existingAccess, alreadyActivated: true };
    }
    throw new ApiError(409, "You already have active access to this module");
  }

  // Steps 6 + 9: create/renew the authorization and stamp activation
  // time, atomically with the key's own activation bookkeeping so the
  // two can never drift out of sync under concurrent requests.
  const now = new Date();
  const [updatedKey, access] = await prisma.$transaction([
    prisma.productKey.update({
      where: { id: key.id },
      data: {
        activationsCount: { increment: 1 },
        status: key.activationsCount + 1 >= key.maxActivations ? "EXHAUSTED" : "ACTIVE",
        activatedAt: key.activatedAt ?? now,
        activatedByUserId: key.activatedByUserId ?? user.id,
      },
    }),
    prisma.userProductAccess.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      update: {
        status: "ACTIVE",
        productKeyId: key.id,
        activatedAt: now,
        expiresAt: key.expiresAt,
      },
      create: {
        userId: user.id,
        productId: product.id,
        productKeyId: key.id,
        status: "ACTIVE",
        activatedAt: now,
        expiresAt: key.expiresAt,
      },
    }),
  ]);

  // Step 10: audit trail — who activated what, when, using which key
  // (by id, never by raw value — the raw value doesn't exist here to log).
  await writeAuditLog({
    actor: user,
    action: "product_key.activate",
    targetType: "Product",
    targetId: product.id,
    metadata: { productCode: product.code, productKeyId: key.id },
  });

  // Step 8: return the authorized product.
  return { product, access, key: updatedKey, alreadyActivated: false };
}

module.exports = { activateProductKey };