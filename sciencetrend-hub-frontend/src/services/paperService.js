import { apiRequest } from "./api";

const PUBLIC_PAPERS_TIMEOUT = 30000;
const PUBLIC_PAPERS_RETRY_DELAY = 650;

function isRetryableCatalogError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("unable to connect")
    || message.includes("timed out")
    || message.includes("server ran into a problem");
}

function waitForRetry() {
  return new Promise((resolve) => {
    setTimeout(resolve, PUBLIC_PAPERS_RETRY_DELAY);
  });
}

async function requestPublicPapers(params) {
  const options = {
    params,
    auth: false,
    timeout: PUBLIC_PAPERS_TIMEOUT,
  };

  try {
    return await apiRequest("/papers", options);
  } catch (error) {
    if (!isRetryableCatalogError(error)) throw error;
    await waitForRetry();
    return apiRequest("/papers", options);
  }
}

// Backend: GET /api/papers?search=&year=&keyword=&page=0&size=10
// Trả về Page<PaperResponse> = { content:[], totalElements, totalPages, ... }
export function getPapers(params = {}) {
  return requestPublicPapers(params);
}

// Tìm kiếm: dùng param "search" (không phải "q" hay "keyword")
export function searchPapers(searchTerm, extraParams = {}) {
  return requestPublicPapers({ search: searchTerm, ...extraParams });
}

export function getPaperById(id) {
  return apiRequest(`/papers/${id}`, { auth: false });
}

// Backend accepts between two and four distinct research paper IDs.
export function comparePapers(ids = []) {
  return apiRequest("/papers/compare", {
    params: { ids },
  });
}
