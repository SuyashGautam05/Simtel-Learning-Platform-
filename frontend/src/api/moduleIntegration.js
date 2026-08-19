import apiClient from "./axiosClient";

/** Fetches the platform → module handoff payload (entry point URL, a
 * short-lived scoped launch token, minimal user/product identity).
 * Only succeeds if the caller currently has valid access to the module —
 * same 401/403/404 semantics as every other module-scoped endpoint. */
export async function fetchModuleLaunch(productId) {
  const { data } = await apiClient.get(`/products/${productId}/launch`);
  return data.data;
}

export async function fetchModuleState(productId) {
  const { data } = await apiClient.get(`/products/${productId}/state`);
  return data.data;
}

/** `payload` is opaque to the platform — whatever JSON the module hands
 * back is stored and returned verbatim later. */
export async function saveModuleState(productId, payload) {
  const { data } = await apiClient.put(`/products/${productId}/state`, { data: payload });
  return data.data;
}