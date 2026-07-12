import { apiRequest } from "./api";

// Connect to GET /api/journals
export function getJournals() {
  return apiRequest("/journals", { auth: false });
}

// Connect to GET /api/journals/search?keyword=...
export function searchJournals(keyword) {
  return apiRequest("/journals/search", { params: { keyword }, auth: false });
}

// Connect to GET /api/journals/top?limit=...
export function getTopJournals(limit = 10) {
  return apiRequest("/journals/top", { params: { limit }, auth: false });
}

// Connect to GET /api/journals/{journalId}
export function getJournalById(id) {
  return apiRequest(`/journals/${id}`, { auth: false });
}

// Connect to GET /api/journals/{journalId}/papers?page=...&size=...
export function getPapersByJournal(journalId, page = 0, size = 10) {
  return apiRequest(`/journals/${journalId}/papers`, { params: { page, size }, auth: false });
}

// Connect to GET /api/journals/following
export function getFollowedJournals() {
  return apiRequest("/journals/following", { method: "GET" });
}

// Connect to POST /api/journals/{journalId}/follow
export function followJournal(journalId) {
  return apiRequest(`/journals/${journalId}/follow`, { method: "POST" });
}

// Connect to DELETE /api/journals/{journalId}/follow
export function unfollowJournal(journalId) {
  return apiRequest(`/journals/${journalId}/follow`, { method: "DELETE" });
}

// Connect to GET /api/journals/{journalId}/follow/check
export function checkJournalFollowed(journalId) {
  return apiRequest(`/journals/${journalId}/follow/check`, { method: "GET" });
}
