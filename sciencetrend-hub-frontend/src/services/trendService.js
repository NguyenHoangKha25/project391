import { apiRequest } from "./api";

// Connect to GET /api/trends/keyword or GET /api/trends/topic from backend
export function getTrendStats(params = {}) {
  const topic = String(params.topic || "").trim();
  if (topic) {
    return apiRequest("/trends/topic", { params: { topic } });
  }
  const keyword = String(params.keyword || "").trim();
  if (!keyword) {
    return Promise.reject(new Error("Select a keyword or topic before loading trend data."));
  }
  return apiRequest("/trends/keyword", { params: { keyword } });
}

// Connect to GET /api/topics/trending limit=10 from backend
export function getTrendingTopics(params = {}) {
  const limit = params.limit || 10;
  return apiRequest("/topics/trending", { params: { limit } });
}

// Connect to GET /api/trends/top-keywords from backend
export function getTrendingKeywords(params = {}) {
  const limit = params.limit || 10;
  return apiRequest("/trends/top-keywords", {
    params: {
      limit,
      ...(params.fromYear ? { fromYear: params.fromYear } : {}),
    },
  });
}

// Helper endpoints
export function getTrendByKeyword(keyword) {
  return apiRequest("/trends/keyword", { params: { keyword } });
}

export function getTrendByTopic(topic) {
  return apiRequest("/trends/topic", { params: { topic } });
}

export function compareTrends({ type, items, fromYear, toYear }) {
  return apiRequest("/trends/compare", {
    params: {
      type: String(type || "KEYWORD").toUpperCase(),
      items,
      ...(fromYear ? { fromYear } : {}),
      ...(toYear ? { toYear } : {}),
    },
  });
}
