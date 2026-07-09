import { apiRequest } from "./api";

// Connect to GET /api/keywords
export function getAllKeywords() {
  return apiRequest("/keywords", { auth: false });
}
