import { apiRequest } from "./api";

export function getAdminUsers(params = {}) {
  return apiRequest("/admin/users", { params });
}

export function getAdminUser(userId) {
  return apiRequest(`/admin/users/${userId}`);
}

export function updateAdminUserRole(userId, role) {
  return apiRequest(`/admin/users/${userId}/role`, { method: "PUT", body: { role } });
}

export function deleteAdminUser(userId) {
  return apiRequest(`/admin/users/${userId}`, { method: "DELETE" });
}

export function getAdminSyncLogs(params = {}) {
  return apiRequest("/admin/sync/logs", { params });
}

export function triggerAdminSync() {
  return apiRequest("/admin/sync", { method: "POST" });
}

export function triggerAdminBackfill({
  fromYear,
  toYear,
  fieldIds = ["17"],
  maxResults,
}) {
  const body = {
    fromYear,
    toYear,
    fieldIds,
  };

  if (maxResults) {
    body.maxResults = maxResults;
  }

  return apiRequest("/admin/sync/backfill", {
    method: "POST",
    body,
    // Historical OpenAlex imports can take longer than regular API requests.
    timeout: 120000,
  });
}

export function getAdminSystemConfig() {
  return apiRequest("/admin/system/config");
}

export function getAdminReports(params = {}) {
  return apiRequest("/admin/reports", { params });
}
