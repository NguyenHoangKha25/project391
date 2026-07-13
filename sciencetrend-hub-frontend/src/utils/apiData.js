// Unwrap các cấu trúc response khác nhau từ backend
export function unwrapResponse(response) {
  if (!response) return response;
  // Backend trả thẳng object/array, không wrap thêm
  return response;
}

export function toArray(response, keys = []) {
  const data = unwrapResponse(response);
  if (!data) return [];
  if (Array.isArray(data)) return data;

  // Spring Page: { content: [...], totalElements, ... }
  if (Array.isArray(data.content)) return data.content;

  const defaultKeys = [...keys, "items", "records", "results", "list", "data"];
  for (const key of defaultKeys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

export function toObject(response) {
  const data = unwrapResponse(response);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(toNumber(value));
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);
  if (absMinutes < 1) return "Just now";
  if (absMinutes < 60) return `${absMinutes} minutes ago`;
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return `${absHours} hours ago`;
  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return `${absDays} days ago`;
  return formatDateTime(value);
}

export function normalizePaper(paper = {}, index = 0) {
  const kwList = Array.isArray(paper.keywords) 
    ? paper.keywords 
    : (paper.keyword ? [paper.keyword] : []);
  return {
    id: paper.researchPaperId ?? paper.paperId ?? paper.id ?? index,
    title: paper.title ?? "Untitled paper",
    source: paper.sourceApi ?? paper.source ?? "Unknown source",
    authors: Array.isArray(paper.authors) ? paper.authors.join(", ") : (paper.authors ?? ""),
    year: paper.year ?? "",
    tag: kwList.length > 0 ? kwList[0] : "Paper",
    href: paper.doi ? `https://doi.org/${paper.doi}` : (paper.externalId ?? ""),
    saved: Boolean(paper.saved ?? paper.bookmarked ?? false),
    abstract: paper.abstractText ?? paper.abstract ?? "",
    citationCount: paper.citationCount ?? 0,
    keywords: kwList,
    doi: paper.doi ?? "",
  };
}

// JournalResponse từ backend: chưa implement, trả về rỗng
export function normalizeJournal(journal = {}, index = 0) {
  return {
    id: journal.id ?? journal.journalId ?? index,
    name: journal.name ?? journal.title ?? "Untitled journal",
    publisher: journal.publisher ?? "Unknown publisher",
    subject: journal.subject ?? journal.field ?? "General",
    quartile: journal.quartile ?? "",
    impactFactor: journal.impactFactor ?? "",
    openAccess: Boolean(journal.openAccess ?? false),
  };
}

// TopicResponse từ backend:
export function normalizeTopic(topic = {}, index = 0) {
  const rawGrowth = topic.growth ?? topic.change ?? 0;
  const growthNumber = Number(rawGrowth);
  const growth = Number.isFinite(growthNumber)
    ? `${growthNumber >= 0 ? "+" : ""}${growthNumber}%`
    : String(rawGrowth || "");

  return {
    id: topic.researchTopicId ?? topic.id ?? topic.topicId ?? index,
    name: topic.name ?? topic.topicName ?? "Untitled topic",
    paperCount: `${formatNumber(topic.paperCount ?? topic.count ?? 0)} papers`,
    growth,
    score: toNumber(topic.score ?? topic.percentage ?? 0),
  };
}

// DashboardChartItemResponse: { label: String, value: Long }
export function normalizeChartPoint(item = {}, index = 0) {
  return {
    label: String(item.label ?? item.year ?? item.month ?? item.name ?? index + 1),
    value: toNumber(item.value ?? item.count ?? item.total ?? 0),
  };
}

// DashboardSummaryResponse:
// { totalPapers, totalJournals, totalKeywords, openAlexPapers,
//   successfulSyncs, failedSyncs, papersByYear[], topKeywords[],
//   topJournals[], topCitedPapers[], latestSyncLog }
export function normalizeDashboard(data = {}) {
  return {
    totalPapers: toNumber(data.totalPapers),
    totalJournals: toNumber(data.totalJournals),
    totalKeywords: toNumber(data.totalKeywords),
    openAlexPapers: toNumber(data.openAlexPapers),
    successfulSyncs: toNumber(data.successfulSyncs),
    failedSyncs: toNumber(data.failedSyncs),
    papersByYear: Array.isArray(data.papersByYear) ? data.papersByYear.map(normalizeChartPoint) : [],
    topKeywords: Array.isArray(data.topKeywords) ? data.topKeywords.map(normalizeChartPoint) : [],
    topJournals: Array.isArray(data.topJournals) ? data.topJournals.map(normalizeChartPoint) : [],
    topCitedPapers: Array.isArray(data.topCitedPapers) ? data.topCitedPapers.map(normalizePaper) : [],
    latestSyncLog: data.latestSyncLog ?? null,
  };
}

// Report:
export function normalizeReport(report = {}, index = 0) {
  const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api"
  ).replace(/\/$/, "");
  
  let downloadUrl = report.downloadUrl ?? report.url ?? "";
  if (downloadUrl && !downloadUrl.startsWith("http")) {
    const cleanUrl = downloadUrl.startsWith("/api") ? downloadUrl.substring(4) : downloadUrl;
    downloadUrl = `${API_BASE_URL}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
  }

  return {
    id: report.id ?? report.reportId ?? report.dashboardReportId ?? index,
    title: report.title ?? report.name ?? "Untitled report",
    description: report.description ?? report.content ?? report.summary ?? "",
    period: report.period ?? report.generatedAt ?? report.createdAt ?? "",
    format: String(report.format ?? report.fileType ?? "PDF").toUpperCase(),
    status: report.status ?? "Ready",
    downloadUrl,
  };
}

// Notification:
export function normalizeNotification(notification = {}, index = 0) {
  let unread = false;
  if (notification.isRead !== undefined) unread = !notification.isRead;
  else if (notification.unread !== undefined) unread = Boolean(notification.unread);
  else if (notification.read !== undefined) unread = notification.read === false;

  return {
    id: notification.id ?? notification.notificationId ?? index,
    title: notification.title ?? notification.subject ?? "Notification",
    message: notification.message ?? notification.content ?? "",
    time: notification.time ?? notification.sendAt ?? notification.createdAt ?? "",
    unread,
    type: notification.type ?? "default",
  };
}
