import { apiRequest } from "./api";

// Legacy raw-count helpers retained for callers outside TrendsPage.
// TrendsPage uses the /analysis endpoints below as its source of truth.
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

export function getKeywordTrendAnalysis(keyword, fromYear, toYear) {
  return apiRequest("/trends/keyword/analysis", {
    params: {
      keyword: String(keyword || "").trim(),
      ...(fromYear ? { fromYear } : {}),
      ...(toYear ? { toYear } : {}),
    },
  });
}

export function getTopicTrendAnalysis(topic, fromYear, toYear) {
  return apiRequest("/trends/topic/analysis", {
    params: {
      topic: String(topic || "").trim(),
      ...(fromYear ? { fromYear } : {}),
      ...(toYear ? { toYear } : {}),
    },
  });
}

// Connect to the role-aware top-topic trend endpoint.
export function getTrendingTopics(params = {}) {
  const limit = params.limit || 10;
  return apiRequest("/trends/top-topics", {
    params: {
      limit,
      ...(params.fromYear ? { fromYear: params.fromYear } : {}),
    },
  });
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

export function getKeywordSuggestions(q, page = 0, size = 10) {
  return apiRequest("/keywords/suggestions", {
    params: { q, page, size },
    auth: false,
  });
}

export function getTopicSuggestions(q, page = 0, size = 10) {
  return apiRequest("/topics/suggestions", {
    params: { q, page, size },
    auth: false,
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
