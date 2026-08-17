import apiClient from "./axiosClient";

/** Full catalog, role-scoped by the backend. For USER, each item is
 * annotated `unlocked: true/false` — this is the single source powering
 * every locked/unlocked module card in the UI. */
export async function fetchProducts(params = {}) {
  const { data } = await apiClient.get("/products", { params });
  return data.data.products;
}

export async function fetchProduct(productId) {
  const { data } = await apiClient.get(`/products/${productId}`);
  return data.data.product;
}

/** Only products the current user is currently authorized to open. */
export async function fetchMyProducts() {
  const { data } = await apiClient.get("/my-products");
  return data.data.products;
}

/** Never throws on "locked" — returns { hasAccess, product, expiresAt }. */
export async function fetchProductAccess(productId) {
  const { data } = await apiClient.get(`/products/${productId}/access`);
  return data.data;
}

export async function fetchProductTopics(productId) {
  const { data } = await apiClient.get(`/products/${productId}/topics`);
  return data.data;
}

export async function fetchProductSimulations(productId) {
  const { data } = await apiClient.get(`/products/${productId}/simulations`);
  return data.data;
}

export async function fetchProductExperiments(productId) {
  const { data } = await apiClient.get(`/products/${productId}/experiments`);
  return data.data;
}

// ---- SUPER_ADMIN-only management (server enforces this — see
// requireSuperAdmin() on the backend route; these calls simply 403 for
// any other role) --------------------------------------------------------

export async function createProduct(input) {
  const { data } = await apiClient.post("/products", input);
  return data.data.product;
}

export async function setProductStatus(productId, status) {
  const { data } = await apiClient.patch(`/products/${productId}/status`, { status });
  return data.data.product;
}

export async function archiveProduct(productId) {
  const { data } = await apiClient.delete(`/products/${productId}`);
  return data.data.product;
}

export async function fetchProductStats(productId) {
  const { data } = await apiClient.get(`/products/${productId}/stats`);
  return data.data;
}