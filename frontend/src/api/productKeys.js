import apiClient from "./axiosClient";

/** Activates a product key for the current user. The backend derives the
 * product entirely from the key itself — there is no productId to pass. */
export async function activateProductKey(key) {
  const { data } = await apiClient.post("/product-keys/activate", { key });
  return data.data;
}