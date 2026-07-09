import { apiRequest } from "./api";

// Backend: GET /api/papers?search=&year=&keyword=&page=0&size=10
// Trả về Page<PaperResponse> = { content:[], totalElements, totalPages, ... }
export function getPapers(params = {}) {
  return apiRequest("/papers", { params, auth: false });
}

// Tìm kiếm: dùng param "search" (không phải "q" hay "keyword")
export function searchPapers(searchTerm, extraParams = {}) {
  return apiRequest("/papers", {
    params: { search: searchTerm, ...extraParams },
    auth: false,
  });
}

export function getPaperById(id) {
  return apiRequest(`/papers/${id}`, { auth: false });
}
