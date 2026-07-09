import { apiRequest } from "./api";

// Backend BookmarkController: GET /api/bookmarks
export function getBookmarkedPapers() {
  return apiRequest("/bookmarks", { method: "GET" });
}

// Backend: POST /api/bookmarks/{paperId}
export function addBookmark(paperId) {
  return apiRequest(`/bookmarks/${paperId}`, { method: "POST" });
}

// Backend: DELETE /api/bookmarks/{paperId}
export function removeBookmark(paperId) {
  return apiRequest(`/bookmarks/${paperId}`, { method: "DELETE" });
}

// Support paper ID toggle directly matching backend endpoint
export function removeBookmarkByPaperId(paperId) {
  return removeBookmark(paperId);
}

// GET /api/bookmarks/check/{paperId} → returns Map<String, Boolean>
export function checkBookmarked(paperId) {
  return apiRequest(`/bookmarks/check/${paperId}`, { method: "GET" });
}

export function toggleBookmark(paperId, currentlySaved) {
  if (currentlySaved) {
    return removeBookmark(paperId);
  }
  return addBookmark(paperId);
}
