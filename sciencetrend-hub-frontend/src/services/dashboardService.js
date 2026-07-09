import { apiRequest } from "./api";

// Backend: GET /api/dashboard/summary — public, không cần auth
// Trả về DashboardSummaryResponse
export function getDashboardOverview() {
  return apiRequest("/dashboard/summary", { auth: false });
}
