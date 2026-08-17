import apiClient from "./axiosClient";

// ---- Platform stats --------------------------------------------------
export async function fetchPlatformStats() {
  const { data } = await apiClient.get("/admin/stats");
  return data.data;
}

// ---- Colleges ----------------------------------------------------------
export async function fetchColleges() {
  const { data } = await apiClient.get("/colleges");
  return data.data.colleges;
}

export async function createCollege(input) {
  const { data } = await apiClient.post("/colleges", input);
  return data.data.college;
}

export async function updateCollege(id, input) {
  const { data } = await apiClient.patch(`/colleges/${id}`, input);
  return data.data.college;
}

export async function deactivateCollege(id) {
  const { data } = await apiClient.delete(`/colleges/${id}`);
  return data.data.college;
}

// ---- Users / Admins ------------------------------------------------------
export async function fetchUsers(filters = {}) {
  const { data } = await apiClient.get("/users", { params: filters });
  return data.data.users;
}

export async function createUser(input) {
  const { data } = await apiClient.post("/users", input);
  return data.data.user;
}

export async function deactivateUser(userId) {
  const { data } = await apiClient.post(`/users/${userId}/deactivate`);
  return data.data.user;
}

export async function activateUser(userId) {
  const { data } = await apiClient.post(`/users/${userId}/activate`);
  return data.data.user;
}

// ---- Audit logs ------------------------------------------------------
export async function fetchAuditLogs(filters = {}) {
  const { data } = await apiClient.get("/audit-logs", { params: filters });
  return data.data;
}

// ---- License usage -----------------------------------------------------
export async function fetchLicenses(filters = {}) {
  const { data } = await apiClient.get("/licenses", { params: filters });
  return data.data.licenses;
}