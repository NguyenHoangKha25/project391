import { apiRequest } from "./api";

// Connect to GET /api/topics
export function getAllTopics() {
  return apiRequest("/topics", { auth: false });
}

// Connect to GET /api/topics/search?keyword=...
export function searchTopics(keyword) {
  return apiRequest("/topics/search", { params: { keyword }, auth: false });
}

// Connect to GET /api/topics/trending?limit=...
export function getTrendingTopics(limit = 10) {
  return apiRequest("/topics/trending", { params: { limit }, auth: false });
}

// Connect to GET /api/topics/{topicId}
export function getTopicDetail(topicId) {
  return apiRequest(`/topics/${topicId}`, { auth: false });
}

// Connect to GET /api/topics/{topicId}/papers?page=...&size=...
export function getPapersByTopic(topicId, page = 0, size = 10) {
  return apiRequest(`/topics/${topicId}/papers`, { params: { page, size }, auth: false });
}
