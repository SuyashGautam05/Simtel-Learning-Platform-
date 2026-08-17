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