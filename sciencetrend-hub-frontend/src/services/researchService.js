import { apiRequest } from "./api";

export function getResearchMindMap({ type, id, limit = 6 }) {
  return apiRequest("/mind-map", {
    params: { type, id, limit },
  });
}
