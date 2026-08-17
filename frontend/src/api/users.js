import apiClient from "./axiosClient";

export async function updateMyProfile(input) {
  const { data } = await apiClient.patch("/users/me", input);
  return data.data.user;
}