import apiClient from "./axiosClient";

/** Activates a product key for the current user. The backend derives the
 * product entirely from the key itself — there is no productId to pass. */
export async function activateProductKey(key) {
  const { data } = await apiClient.post("/product-keys/activate", { key });
  return data.data;
}

// ---- SUPER_ADMIN-only key management — the server enforces this via
// requireSuperAdmin() on every one of these routes; a non-super-admin
// calling them gets a real 403, this is not just a hidden UI affordance.

export async function generateProductKeys(input) {
  const { data } = await apiClient.post("/product-keys/generate", input);
  return data.data.keys;
}

export async function fetchProductKeys(filters = {}) {
  const { data } = await apiClient.get("/product-keys", { params: filters });
  return data.data;
}

export async function revokeProductKey(keyId) {
  const { data } = await apiClient.post(`/product-keys/${keyId}/revoke`);
  return data.data.key;
}

export async function reactivateProductKey(keyId) {
  const { data } = await apiClient.post(`/product-keys/${keyId}/reactivate`);
  return data.data.key;
}