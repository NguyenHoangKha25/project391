import { apiRequest } from "./api";

export function getReports(params = {}) {
  return apiRequest("/reports/my", { method: "GET", params });
}

export function getAdminReports(params = {}) {
  return apiRequest("/admin/reports", { method: "GET", params });
}

export function getReportById(reportId) {
  return apiRequest(`/reports/${reportId}`, { method: "GET" });
}

export function generateReport(params = {}) {
  return apiRequest("/reports/generate", { method: "POST", body: params });
}

export function searchReports(query, params = {}) {
  return apiRequest("/reports/search", {
    method: "GET",
    params: { ...params, query },
  });
}

export function deleteReport(reportId) {
  return apiRequest(`/reports/${reportId}`, { method: "DELETE" });
}

export function downloadReport(url) {
  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
  ).replace(/\/$/, "");
  
  const cleanUrl = url.startsWith("/api") ? url.substring(4) : url;
  return `${API_BASE_URL}${cleanUrl}`;
}
