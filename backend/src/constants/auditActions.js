/**
 * Every audit action name used anywhere in the app lives here, as a
 * constant — never a hand-typed string at the call site. This is what
 * keeps "USER_DEACTIVATED" from silently becoming "user.deactivate" in
 * one place and "USER_DEACTIVATE" in another.
 *
 * The 15 actions below the first divider are the required set. A few
 * extra (COLLEGE_*, USER_ACTIVATED, PRODUCT_KEY_REACTIVATED,
 * PRODUCT_KEY_EXPORTED) are included for completeness of the audit trail
 * but weren't explicitly required — they follow the same naming
 * convention so the log stays consistent.
 */
const AUDIT_ACTIONS = {
  // ---- Required set -------------------------------------------------
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  FAILED_LOGIN: "FAILED_LOGIN",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_KEY_GENERATED: "PRODUCT_KEY_GENERATED",
  PRODUCT_KEY_ACTIVATED: "PRODUCT_KEY_ACTIVATED",
  PRODUCT_KEY_REVOKED: "PRODUCT_KEY_REVOKED",
  PRODUCT_ACCESS_GRANTED: "PRODUCT_ACCESS_GRANTED",
  PRODUCT_ACCESS_REVOKED: "PRODUCT_ACCESS_REVOKED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  ADMIN_CREATED: "ADMIN_CREATED",

  // ---- Supplementary (same convention, not explicitly required) -----
  USER_ACTIVATED: "USER_ACTIVATED",
  USER_DELETED: "USER_DELETED",
  PRODUCT_KEY_REACTIVATED: "PRODUCT_KEY_REACTIVATED",
  PRODUCT_KEY_EXPORTED: "PRODUCT_KEY_EXPORTED",
  COLLEGE_CREATED: "COLLEGE_CREATED",
  COLLEGE_UPDATED: "COLLEGE_UPDATED",
  COLLEGE_DEACTIVATED: "COLLEGE_DEACTIVATED",
};

/** Every action that targets (or self-targets, for auth events) a User
 * — this is what lets an ADMIN's college-scoped audit query work by
 * filtering on targetType/targetId rather than needing bespoke logic
 * per action. */
const USER_TARGETED_ACTIONS = new Set([
  AUDIT_ACTIONS.LOGIN,
  AUDIT_ACTIONS.LOGOUT,
  AUDIT_ACTIONS.FAILED_LOGIN,
  AUDIT_ACTIONS.USER_CREATED,
  AUDIT_ACTIONS.USER_UPDATED,
  AUDIT_ACTIONS.USER_DEACTIVATED,
  AUDIT_ACTIONS.USER_ACTIVATED,
  AUDIT_ACTIONS.USER_DELETED,
  AUDIT_ACTIONS.PASSWORD_CHANGED,
  AUDIT_ACTIONS.ADMIN_CREATED,
]);

module.exports = { AUDIT_ACTIONS, USER_TARGETED_ACTIONS };