import { apiRequest } from "./api";

export function getResearchMindMap({ type, id, limit = 5, fromYear, toYear }) {
  return apiRequest("/mind-map", {
    params: { type, id, limit, fromYear, toYear },
  });
}

export function getMindMapEvidence({ rootType, rootId, targetType, targetId, page = 0, size = 5 }) {
  return apiRequest("/mind-map/evidence", {
    params: { rootType, rootId, targetType, targetId, page, size },
  });
}
