const prisma = require("../config/db");
const { ApiError } = require("../utils/apiResponse");
const { writeAuditLog } = require("../utils/audit");
const { AUDIT_ACTIONS } = require("../constants/auditActions");
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
 *   2. Validate the key        — hash lookup; unknown hash → generic error
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
 *
 * SECURITY: steps 2–4 and the exhaustion check in step 7 all throw the
 * SAME generic ApiError (genericKeyFailure below) — same status code,
 * same message — regardless of whether the submitted key doesn't exist
 * at all, exists but was revoked, exists but expired, or exists but has
 * no activations left. Previously these returned four distinguishable
 * responses (404/403/410/409 with different text), which is a status
 * oracle: an attacker submitting guesses could learn "that string
 * matches a real key that happens to be revoked" versus "that string
 * matches nothing," narrowing the search space even though the key
 * itself is high-entropy. The REAL reason is still recorded — server-
 * side only, in the audit log's metadata — for legitimate admin
 * investigation; it is never part of the HTTP response.
 * -----------------------------------------------------------------------
 */
async function activateProductKey(user, rawKey, req) {
  const keyHash = hashProductKey(rawKey);

  const genericKeyFailure = async (reason, key) => {
    await writeAuditLog({
      actor: user,
      action: AUDIT_ACTIONS.PRODUCT_KEY_ACTIVATION_FAILED,
      targetType: "ProductKey",
      targetId: key?.id,
      metadata: { reason }, // the real reason — internal/audit only, never in the HTTP response
      req,
    });
    throw new ApiError(400, "Invalid or expired product key");
  };

  // Step 2: validate the key exists at all.
  const key = await prisma.productKey.findUnique({
    where: { keyHash },
    include: { product: true },
  });
  if (!key) {
    return genericKeyFailure("not_found", null);
  }

  // Step 3: status checks.
  if (key.status === "REVOKED") {
    return genericKeyFailure("revoked", key);
  }

  // Step 4: expiration — evaluated against real time, not just the
  // stored status, so a key that expired since it was last touched is
  // still caught even if a background job hasn't swept it yet.
  if (key.expiresAt && key.expiresAt <= new Date()) {
    if (key.status !== "EXPIRED") {
      await prisma.productKey.update({ where: { id: key.id }, data: { status: "EXPIRED" } });
    }
    return genericKeyFailure("expired", key);
  }

  if (key.activationsCount >= key.maxActivations) {
    if (key.status !== "EXHAUSTED") {
      await prisma.productKey.update({ where: { id: key.id }, data: { status: "EXHAUSTED" } });
    }
    return genericKeyFailure("exhausted", key);
  }

  // Step 5: the product is whatever this key points to. There is no
  // other source of truth — the request body has no productId field to
  // even try to trust (see activateKeySchema).
  const product = key.product;
  if (!product || product.deletedAt || product.status === "ARCHIVED") {
    return genericKeyFailure("product_unavailable", key);
  }

  checkActivationRules(key.activationRules, user);

  // Step 7: duplicate-activation handling. This branch is NOT part of the
  // generic-failure collapsing above: reaching it requires the submitted
  // key to already be genuinely valid (all checks above passed), so it
  // reveals nothing new to someone still guessing — the "oracle" risk
  // only applies to distinguishing valid-but-unusable keys from
  // nonexistent ones, not to a key that has already been confirmed valid.
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
  // Two distinct events are recorded, matching the two distinct things
  // that just happened: the KEY was consumed (a ProductKey lifecycle
  // event), and ACCESS was granted (a UserProductAccess lifecycle event).
  // They usually happen together but aren't the same fact — e.g. a
  // pool key with maxActivations > 1 gets one PRODUCT_KEY_ACTIVATED per
  // redemption, each producing its own PRODUCT_ACCESS_GRANTED for a
  // different student.
  await writeAuditLog({
    actor: user,
    action: AUDIT_ACTIONS.PRODUCT_KEY_ACTIVATED,
    targetType: "ProductKey",
    targetId: key.id,
    metadata: { productCode: product.code },
    req,
  });
  await writeAuditLog({
    actor: user,
    action: AUDIT_ACTIONS.PRODUCT_ACCESS_GRANTED,
    targetType: "Product",
    targetId: product.id,
    metadata: { productCode: product.code, viaProductKeyId: key.id },
    req,
  });

  // Step 8: return the authorized product.
  return { product, access, key: updatedKey, alreadyActivated: false };
}

module.exports = { activateProductKey };