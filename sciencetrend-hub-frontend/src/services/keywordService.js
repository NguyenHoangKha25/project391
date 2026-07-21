import { apiRequest } from "./api";

// Connect to GET /api/keywords
export function getAllKeywords(params = {}) {
  return apiRequest("/keywords", { params, auth: false });
}
