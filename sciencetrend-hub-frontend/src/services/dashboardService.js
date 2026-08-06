import { apiRequest } from "./api";

/**
 * Unified dashboard endpoint — returns role, overview, analytics,
 * operations (Admin only) and capabilities in one response.
 * Requires authentication.
 */
export function getDashboardHome() {
  return apiRequest("/dashboard/home");
}

// --- Backward-compatible individual endpoints (prefer getDashboardHome) ---

export function getDashboardOverview() {
  return apiRequest("/dashboard/summary", { auth: true });
}

export function getDashboardAnalytics() {
  return apiRequest("/dashboard/analytics");
}

export function getDashboardOperations() {
  return apiRequest("/dashboard/operations");
}
