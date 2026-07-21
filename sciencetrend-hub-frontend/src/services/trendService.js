import { apiRequest } from "./api";

// Connect to GET /api/trends/keyword or GET /api/trends/topic from backend
export function getTrendStats(params = {}) {
  if (params.topic) {
    return apiRequest("/trends/topic", { params: { topic: params.topic }, auth: false });
  }
  const keyword = params.keyword || "computer science";
  return apiRequest("/trends/keyword", { params: { keyword }, auth: false });
}

// Connect to GET /api/topics/trending limit=10 from backend
export function getTrendingTopics(params = {}) {
  const limit = params.limit || 10;
  return apiRequest("/topics/trending", { params: { limit }, auth: false });
}

// Helper endpoints
export function getTrendByKeyword(keyword) {
  return apiRequest("/trends/keyword", { params: { keyword }, auth: false });
}

export function getTrendByTopic(topic) {
  return apiRequest("/trends/topic", { params: { topic }, auth: false });
}
