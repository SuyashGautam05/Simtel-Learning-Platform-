import apiClient from "./axiosClient";

/** College Admin dashboard stats — server-scoped to the requester's own
 * college; SUPER_ADMIN may pass any collegeId. There is no client-side
 * filtering here — the backend enforces which college's data comes back. */
export async function fetchCollegeStats(collegeId) {
  const { data } = await apiClient.get(`/colleges/${collegeId}/stats`);
  return data.data;
}

export async function fetchCollegeRecentActivity(collegeId) {
  const { data } = await apiClient.get(`/colleges/${collegeId}/recent-activity`);
  return data.data.activity;
}

/** A single student's module authorizations ("view progress"). */
export async function fetchUserAccess(userId) {
  const { data } = await apiClient.get(`/users/${userId}/access`);
  return data.data.access;
}

/** Resets a student's password via the secure server-side workflow —
 * returns the one-time temporary password to relay to the student. */
export async function resetUserPassword(userId) {
  const { data } = await apiClient.post(`/users/${userId}/reset-password`);
  return data.data.tempPassword;
}