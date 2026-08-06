function appendEntityQuery(path, key, id, name = "") {
  const params = new URLSearchParams();
  if (id !== null && id !== undefined && String(id).trim()) {
    params.set(key, String(id));
  }
  if (name) params.set("name", String(name));
  return `${path}?${params.toString()}`;
}

function appendFilterQuery(key, value) {
  const params = new URLSearchParams({ [key]: String(value || "") });
  return `/papers?${params.toString()}`;
}

export const ROUTE_PATHS = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  OAUTH2_CALLBACK: "/oauth2/callback",
  DASHBOARD: "/dashboard",
  MY_ACCOUNT: "/my-account",
  PAPERS: "/papers",
  PAPER_DETAIL: "/papers/:paperId",
  paperDetail: (paperId) => `/papers/${paperId}`,
  TRENDS: "/trends",
  TOPICS: "/topics",
  topicDetail: (topicId, name = "") => appendEntityQuery("/topics", "topic", topicId, name),
  JOURNALS: "/journals",
  journalDetail: (journalId, name = "") => appendEntityQuery("/journals", "journal", journalId, name),
  KEYWORDS: "/keywords",
  keywordPapers: (keyword) => appendFilterQuery("keyword", keyword),
  journalPapers: (journal) => appendFilterQuery("journal", journal),
  topicPapers: (topic) => appendFilterQuery("topic", topic),
  BOOKMARKS: "/bookmarks",
  FOLLOWING: "/following",
  NOTIFICATIONS: "/notifications",
  REPORTS: "/reports",
  RESEARCH_LAB: "/research-lab",
  ADMIN: "/admin",
};
