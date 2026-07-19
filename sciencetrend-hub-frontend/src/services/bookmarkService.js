import { apiRequest } from "./api";

/**
 * Retrieves the list of bookmarked papers for the current logged-in user.
 * 
 * @returns {Promise<Array>} List of paper bookmark records from the server.
 */
export function getBookmarkedPapers() {
  return apiRequest("/bookmarks", { method: "GET" });
}

/**
 * Adds a paper to the user's bookmarks list.
 * 
 * @param {string|number} paperId - The target paper identifier.
 * @returns {Promise<Object>} The bookmark creation response.
 */
export function addBookmark(paperId) {
  return apiRequest(`/bookmarks/${paperId}`, { method: "POST" });
}

/**
 * Removes a paper from the user's bookmarks list.
 * 
 * @param {string|number} paperId - The target paper identifier.
 * @returns {Promise<Object>} Response indicating result of removal.
 */
export function removeBookmark(paperId) {
  return apiRequest(`/bookmarks/${paperId}`, { method: "DELETE" });
}

/**
 * Helper to remove a bookmark by its paper ID.
 * 
 * @param {string|number} paperId - Target paper identifier.
 * @returns {Promise<Object>} Response indicating result of removal.
 */
export function removeBookmarkByPaperId(paperId) {
  return removeBookmark(paperId);
}

/**
 * Queries the bookmark status of a specific paper.
 * 
 * @param {string|number} paperId - Target paper identifier.
 * @returns {Promise<Object>} Map of bookmark status validation flag.
 */
export function checkBookmarked(paperId) {
  return apiRequest(`/bookmarks/check/${paperId}`, { method: "GET" });
}

/**
 * Toggles the bookmark status of a paper on/off.
 * 
 * @param {string|number} paperId - Target paper identifier.
 * @param {boolean} currentlySaved - The active toggle state.
 * @returns {Promise<Object>} Response of bookmark add or remove operation.
 */
export function toggleBookmark(paperId, currentlySaved) {
  if (currentlySaved) {
    return removeBookmark(paperId);
  }
  return addBookmark(paperId);
}

/**
 * Retrieves the list of followed keywords for the user.
 * 
 * @returns {Promise<Array>} List of bookmarked keywords.
 */
export function getBookmarkedKeywords() {
  return apiRequest("/bookmarks/keywords", { method: "GET" });
}

/**
 * Follows/bookmarks a search keyword.
 * 
 * @param {string|number} keywordId - Target keyword identifier.
 * @returns {Promise<Object>} Confirmation response from the server.
 */
export function addKeywordBookmark(keywordId) {
  return apiRequest(`/bookmarks/keywords/${keywordId}`, { method: "POST" });
}

/**
 * Unfollows/removes bookmark for a keyword.
 * 
 * @param {string|number} keywordId - Target keyword identifier.
 * @returns {Promise<Object>} Confirmation response from the server.
 */
export function removeKeywordBookmark(keywordId) {
  return apiRequest(`/bookmarks/keywords/${keywordId}`, { method: "DELETE" });
}

/**
 * Queries the bookmark status of a specific keyword.
 * 
 * @param {string|number} keywordId - Target keyword identifier.
 * @returns {Promise<Object>} Map of validation flag.
 */
export function checkKeywordBookmarked(keywordId) {
  return apiRequest(`/bookmarks/keywords/check/${keywordId}`, { method: "GET" });
}
