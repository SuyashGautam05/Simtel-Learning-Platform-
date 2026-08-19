const { signLaunchToken } = require("../utils/moduleLaunchToken");

/**
 * buildLaunchPayload
 * -----------------------------------------------------------------------
 * Called only after requireProductAccess() (or requireModuleAccessDynamic)
 * has already confirmed the user is authorized for this product — this
 * function's entire job is assembling what the iframe needs to bootstrap,
 * nothing more. It never touches simulation logic.
 *
 * This is the complete "platform → module" side of the contract from
 * MODULE_INTEGRATION.md:
 *   - entryPointUrl: where to load the module's own bundle from
 *   - launchToken: short-lived proof of authorization (see
 *     utils/moduleLaunchToken.js) — NOT the platform session token
 *   - user: minimal identity, no email/role beyond what's needed to
 *     personalize the sim (e.g. display name)
 *   - product: id/code/name/version, so multi-module bundles can branch
 * -----------------------------------------------------------------------
 */
function buildLaunchPayload({ user, product }) {
  const launchToken = signLaunchToken({
    userId: user.id,
    productId: product.id,
    productCode: product.code,
  });

  return {
    entryPointUrl: product.entryPointUrl,
    integrationType: product.integrationType,
    launchToken,
    expiresInSeconds: 600,
    user: { id: user.id, name: user.name },
    product: { id: product.id, code: product.code, name: product.name, version: product.version },
  };
}

module.exports = { buildLaunchPayload };