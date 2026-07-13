import { apiRequest } from "./api";

export function getReports() {
  return apiRequest("/reports/my", { method: "GET" });
}

export function generateReport(params = {}) {
  return apiRequest("/reports/generate", { method: "POST", body: params });
}

export function downloadReport(url) {
  // Since url is like /api/reports/123/download, and window.open/fetch needs the full URL,
  // we resolve it based on VITE_API_BASE_URL.
  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
  ).replace(/\/$/, "");
  
  // Replace the '/api' prefix from the endpoint because API_BASE_URL already ends with '/api'
  const cleanUrl = url.startsWith("/api") ? url.substring(4) : url;
  return `${API_BASE_URL}${cleanUrl}`;
}
