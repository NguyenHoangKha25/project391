// Backend DashboardReportController is currently an empty stub (not yet implemented)
// We return empty resolved promises to keep the UI clean without causing 404 network failures.

export function getReports() {
  return Promise.resolve([]);
}

export function generateReport(params = {}) {
  return Promise.resolve(null);
}

export function downloadReport(url) {
  return url;
}
