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

// Connect to GET /api/topics/following
export function getFollowedTopics() {
  return apiRequest("/topics/following", { method: "GET" });
}

// Connect to POST /api/topics/{topicId}/follow
export function followTopic(topicId) {
  return apiRequest(`/topics/${topicId}/follow`, { method: "POST" });
}

// Connect to DELETE /api/topics/{topicId}/follow
export function unfollowTopic(topicId) {
  return apiRequest(`/topics/${topicId}/follow`, { method: "DELETE" });
}

// Connect to GET /api/topics/{topicId}/follow/check
export function checkTopicFollowed(topicId) {
  return apiRequest(`/topics/${topicId}/follow/check`, { method: "GET" });
}
