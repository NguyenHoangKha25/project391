import { apiRequest } from "./api";

/**
 * Retrieves the full list of journals.
 * 
 * @returns {Promise<Array>} List of journal profiles.
 */
export function getJournals(params = {}) {
  return apiRequest("/journals", { params, auth: false, timeout: 30000 });
}

/**
 * Searches journals by a keyword string.
 * 
 * @param {string} keyword - Search pattern matching name, subject, or publisher.
 * @returns {Promise<Array>} List of matching journal profiles.
 */
export function searchJournals(keyword, params = {}) {
  return apiRequest("/journals/search", {
    params: { ...params, keyword },
    auth: false,
    timeout: 30000,
  });
}

/**
 * Retrieves the top-ranked journals.
 * 
 * @param {number} [limit=10] - Number of items to return.
 * @returns {Promise<Array>} Sorted list of top journals.
 */
export function getTopJournals(limit = 10) {
  return apiRequest("/journals/top", { params: { limit }, auth: false, timeout: 30000 });
}

/**
 * Retrieves a single journal profile by ID.
 * 
 * @param {string|number} id - Target journal identifier.
 * @returns {Promise<Object>} Journal profile details.
 */
export function getJournalById(id) {
  return apiRequest(`/journals/${id}`, { auth: false });
}

/**
 * Retrieves paginated research papers published under a journal.
 * 
 * @param {string|number} journalId - Target journal identifier.
 * @param {number} [page=0] - Active page index.
 * @param {number} [size=10] - Number of results per page.
 * @returns {Promise<Object>} Paginated papers content list.
 */
export function getPapersByJournal(journalId, page = 0, size = 10) {
  return apiRequest(`/journals/${journalId}/papers`, { params: { page, size }, auth: false });
}

/**
 * Retrieves the list of journals followed by the current user.
 * 
 * @returns {Promise<Array>} List of followed journals.
 */
export function getFollowedJournals() {
  return apiRequest("/journals/following", { method: "GET" });
}

/**
 * Tracks/follows a specific journal.
 * 
 * @param {string|number} journalId - Target journal identifier.
 * @returns {Promise<Object>} Follow relationship result.
 */
export function followJournal(journalId) {
  return apiRequest(`/journals/${journalId}/follow`, { method: "POST" });
}

/**
 * Untracks/unfollows a specific journal.
 * 
 * @param {string|number} journalId - Target journal identifier.
 * @returns {Promise<Object>} Follow relationship result.
 */
export function unfollowJournal(journalId) {
  return apiRequest(`/journals/${journalId}/follow`, { method: "DELETE" });
}

/**
 * Checks if a specific journal is followed by the user.
 * 
 * @param {string|number} journalId - Target journal identifier.
 * @returns {Promise<Object>} Map containing validation flag status.
 */
export function checkJournalFollowed(journalId) {
  return apiRequest(`/journals/${journalId}/follow/check`, { method: "GET" });
}
