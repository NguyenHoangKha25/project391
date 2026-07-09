import { apiRequest } from "./api";

// Backend: GET /api/auth/me — cần auth, trả về UserResponse
export function getCurrentUser() {
  return apiRequest("/auth/me", { method: "GET" });
}
