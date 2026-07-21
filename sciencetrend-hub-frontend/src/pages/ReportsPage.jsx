import { useCallback, useEffect, useMemo, useState } from "react";
import { FiBarChart2, FiDownload, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { deleteReport, generateReport, getReports, searchReports } from "../services/reportService";
import { formatDateTime, normalizeReport, toArray } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/ReportsPage.css";

function chartPoints(chart = {}) {
  const raw = chart.data ?? chart.points ?? chart.items ?? [];
  if (Array.isArray(raw)) {
    return raw.map((item, index) => ({
      label: String(item?.label ?? item?.name ?? item?.year ?? index + 1),
      value: Number(item?.value ?? item?.count ?? item ?? 0) || 0,
    }));
  }
  if (Array.isArray(chart.labels) && Array.isArray(chart.values)) {
    return chart.labels.map((label, index) => ({ label: String(label), value: Number(chart.values[index]) || 0 }));
  }
  return [];
}

function ReportChart({ chart }) {
  const points = chartPoints(chart);
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="report-chart">
      <h4>{chart.title || chart.name || "Report chart"}</h4>
      {points.length > 0 ? (
        <div className="report-chart-bars">
          {points.slice(0, 12).map((point) => (
            <div key={point.label} className="report-chart-row">
              <span title={point.label}>{point.label}</span>
              <div><i style={{ width: `${Math.max((point.value / max) * 100, 2)}%` }} /></div>
              <strong>{point.value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      ) : <p>No chart points were returned.</p>}
    </div>
  );
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reportType, setReportType] = useState("summary");
  const [subject, setSubject] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadReports = useCallback(async (search = "") => {
    setLoading(true);
    setErrorMessage("");
    try {
      let response;
      if (search) {
        try {
          response = await searchReports(search, { page: 0, size: 50 });
        } catch {
          const fallback = await getReports({ page: 0, size: 100 });
          const term = search.toLowerCase();
          response = toArray(fallback, ["reports"]).filter((item) =>
            `${item.title || item.name || ""} ${item.description || item.content || ""}`.toLowerCase().includes(term),
          );
        }
      } else {
        response = await getReports({ page: 0, size: 50 });
      }
      setReports(toArray(response, ["reports"]).map(normalizeReport));
    } catch (error) {
      setReports([]);
      setErrorMessage(error.message || "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleCreateReport(event) {
    event.preventDefault();
    setCreating(true);
    setErrorMessage("");
    try {
      await generateReport({ type: reportType, ...(subject.trim() ? { subject: subject.trim() } : {}) });
      setSubject("");
      await loadReports();
    } catch (error) {
      setErrorMessage(error.message || "Could not generate the report.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(report) {
    if (!window.confirm(`Delete “${report.title}”?`)) return;
    const previous = reports;
    setReports((current) => current.filter((item) => item.id !== report.id));
    if (selected?.id === report.id) setSelected(null);
    try {
      await deleteReport(report.id);
    } catch (error) {
      setReports(previous);
      setErrorMessage(error.message || "Could not delete the report.");
    }
  }

  function handleDownload(report) {
    if (report.downloadUrl) {
      window.open(report.downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!report.content) {
      setErrorMessage("This report does not have downloadable content yet.");
      return;
    }
    const blob = new Blob([report.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/[\s/:*?"<>|]+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const readyCount = useMemo(
    () => reports.filter((report) => String(report.status).toLowerCase() !== "pending").length,
    [reports],
  );

  return (
    <MainLayout title="Reports" subtitle="Generate, review and export research analysis">
      <section className="workspace-page reports-page">
        <div className="reports-summary">
          <div><span className="catalog-kicker">Research reporting</span><h2>Your reports</h2><p>{readyCount} ready · {reports.length} total</p></div>
          <form className="reports-create-form" onSubmit={handleCreateReport}>
            <select value={reportType} onChange={(event) => setReportType(event.target.value)} aria-label="Report type">
              <option value="summary">Summary</option>
              <option value="trend">Trend analysis</option>
              <option value="citation">Citation analysis</option>
              <option value="topic">Topic report</option>
            </select>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Optional keyword or topic" />
            <button className="workspace-button primary" type="submit" disabled={creating}><FiPlus />{creating ? "Generating…" : "Generate"}</button>
          </form>
        </div>

        <form className="reports-search" onSubmit={(event) => { event.preventDefault(); loadReports(query.trim()); }}>
          <FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your reports" />
          {query && <button type="button" onClick={() => { setQuery(""); loadReports(); }} aria-label="Clear report search"><FiX /></button>}
        </form>
        {errorMessage && <div className="workspace-notice warning">{errorMessage}</div>}

        {loading ? (
          <div className="workspace-empty"><span className="workspace-loading-spinner" />Loading reports…</div>
        ) : reports.length > 0 ? (
          <div className="reports-list">
            {reports.map((report) => (
              <article className="report-row" key={report.id}>
                <span className="report-row-icon"><FiBarChart2 /></span>
                <button type="button" className="report-row-main" onClick={() => setSelected(report)}>
                  <strong>{report.title}</strong>
                  <span>{report.description || "Open report details"}</span>
                </button>
                <div className="report-row-meta">
                  <span className="workspace-status">{report.status}</span>
                  <time>{report.period ? formatDateTime(report.period) : "Recently generated"}</time>
                </div>
                <div className="report-row-actions">
                  <button type="button" onClick={() => handleDownload(report)} aria-label={`Download ${report.title}`}><FiDownload /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(report)} aria-label={`Delete ${report.title}`}><FiTrash2 /></button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="workspace-empty">No reports found. Generate a report to get started.</div>}

        {selected && (
          <div className="report-preview-backdrop" onClick={() => setSelected(null)}>
            <article className="report-preview" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="report-preview-close" onClick={() => setSelected(null)} aria-label="Close report preview"><FiX /></button>
              <span className="catalog-kicker">Generated report</span>
              <h2>{selected.title}</h2>
              <p className="report-preview-meta">{selected.period ? formatDateTime(selected.period) : "Recently generated"} · {selected.format}</p>
              <div className="report-content">{selected.content || selected.description || "No narrative content was returned."}</div>
              {selected.charts.length > 0 && <div className="report-charts">{selected.charts.map((chart, index) => <ReportChart key={chart.id ?? chart.title ?? index} chart={chart} />)}</div>}
              <button type="button" className="workspace-button primary" onClick={() => handleDownload(selected)}><FiDownload /> Download report</button>
            </article>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default ReportsPage;
