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

function LineChart({ points }) {
  const max = Math.max(...points.map((p) => p.value), 10);
  const width = 340;
  const height = 110;
  const padding = 16;
  
  const coords = points.map((p, idx) => {
    const denom = points.length > 1 ? points.length - 1 : 1;
    const x = padding + (idx * (width - 2 * padding)) / denom;
    const y = height - padding - ((p.value) * (height - 2 * padding)) / max;
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${height - padding} L ${coords[0].x.toFixed(1)},${height - padding} Z`
    : "";

  return (
    <div className="report-line-container" style={{ marginTop: "12px" }}>
      <svg width="100%" height="110" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="reportLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#reportLineGrad)" />
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2">
            <title>{`${c.label}: ${c.value} papers`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--st-muted-strong, #64748b)", marginTop: "4px" }}>
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function DonutChart({ points }) {
  const total = points.reduce((sum, p) => sum + p.value, 0) || 1;
  const colors = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#c7d2fe", "#818cf8"];
  
  const slices = points.slice(0, 5).map((p, idx) => {
    const pct = Math.round((p.value / total) * 100);
    return { ...p, pct, color: colors[idx % colors.length] };
  });

  return (
    <div className="report-donut-container" style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "12px", flexWrap: "wrap" }}>
      <svg width="110" height="110" viewBox="0 0 42 42" className="donut-svg">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
        {slices.map((slice, idx) => {
          const strokeDasharray = `${slice.pct} ${100 - slice.pct}`;
          const offset = 100 - slices.slice(0, idx).reduce((sum, s) => sum + s.pct, 0) + 25;
          return (
            <circle
              key={idx}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="6"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="donut-legend" style={{ display: "grid", gap: "6px", fontSize: "12px", flex: 1 }}>
        {slices.map((slice, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: slice.color, display: "inline-block" }} />
            <span style={{ fontWeight: 600, color: "var(--st-text-main, #1e293b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }} title={slice.label}>{slice.label}:</span>
            <span style={{ color: "var(--st-muted-strong, #64748b)" }}>{slice.value} ({slice.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnChart({ points }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="report-column-container" style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "110px", marginTop: "16px", paddingBottom: "24px", position: "relative" }}>
      {points.slice(0, 7).map((p, idx) => {
        const heightPct = Math.max((p.value / max) * 100, 10);
        return (
          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#2563eb", marginBottom: "4px" }}>{p.value}</span>
            <div style={{ width: "100%", height: `${heightPct}%`, backgroundImage: "linear-gradient(to bottom, #3b82f6, #1d4ed8)", borderRadius: "4px" }} />
            <span style={{ position: "absolute", bottom: "0", fontSize: "10px", color: "var(--st-muted-strong, #64748b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45px" }} title={p.label}>{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ points }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="report-chart-bars" style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
      {points.slice(0, 6).map((point, idx) => (
        <div key={idx} className="report-chart-row" style={{ display: "grid", gridTemplateColumns: "130px 1fr 50px", alignItems: "center", gap: "10px", fontSize: "12px" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }} title={point.label}>{point.label}</span>
          <div style={{ background: "var(--st-border, #e2e8f0)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: `${Math.max((point.value / max) * 100, 3)}%`, backgroundImage: "linear-gradient(to right, #3b82f6, #6366f1)", borderRadius: "4px" }} />
          </div>
          <strong style={{ fontSize: "12px", textAlign: "right" }}>{point.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function ReportChart({ chart, index = 0 }) {
  const points = chartPoints(chart);
  const title = (chart.title || chart.name || "").toLowerCase();

  let chartType = "bar";
  if (title.includes("year") || title.includes("năm") || index === 0) {
    chartType = "line";
  } else if (title.includes("journal") || title.includes("tạp chí") || index === 2) {
    chartType = "donut";
  } else if (title.includes("keyword") || title.includes("từ khóa") || index === 1) {
    chartType = "column";
  } else {
    chartType = "bar";
  }

  return (
    <div className="report-chart-card" style={{ background: "var(--st-card-bg, #ffffff)", border: "1px solid var(--st-border, #e2e8f0)", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--st-text-main, #1e293b)" }}>{chart.title || chart.name || "Report chart"}</h4>
        <span style={{ fontSize: "11px", fontWeight: 600, background: "var(--st-highlight-bg, #eff6ff)", color: "#2563eb", padding: "2px 8px", borderRadius: "12px", textTransform: "uppercase" }}>
          {chartType === "line" ? "Line Chart" : chartType === "donut" ? "Donut Chart" : chartType === "column" ? "Column Chart" : "Bar Chart"}
        </span>
      </div>
      {points.length > 0 ? (
        chartType === "line" ? <LineChart points={points} /> :
        chartType === "donut" ? <DonutChart points={points} /> :
        chartType === "column" ? <ColumnChart points={points} /> :
        <BarChart points={points} />
      ) : <p style={{ fontSize: "12px", color: "var(--st-text-muted)" }}>No chart points returned.</p>}
    </div>
  );
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportKeyword, setReportKeyword] = useState("");
  const [reportTopic, setReportTopic] = useState("");
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
      const payload = {
        title: reportTitle.trim() || undefined,
        keyword: reportKeyword.trim() || undefined,
        topic: reportTopic.trim() || undefined,
      };
      await generateReport(payload);
      setReportTitle("");
      setReportKeyword("");
      setReportTopic("");
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
    link.download = `${(report.title || "Report").replace(/[\s/:*?"<>|]+/g, "_")}.txt`;
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
          <div>
            <span className="catalog-kicker">Research Intelligence</span>
            <h2>My Reports</h2>
            <p>{readyCount} ready · {reports.length} total</p>
          </div>
          <form className="reports-create-form" onSubmit={handleCreateReport}>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Report title (e.g. Researcher Trend Report)"
            />
            <input
              type="text"
              value={reportKeyword}
              onChange={(e) => setReportKeyword(e.target.value)}
              placeholder="Filter keyword (e.g. Transformer)"
            />
            <input
              type="text"
              value={reportTopic}
              onChange={(e) => setReportTopic(e.target.value)}
              placeholder="Filter topic (e.g. Topic Modeling)"
            />
            <button className="workspace-button primary" type="submit" disabled={creating}>
              <FiPlus />{creating ? "Generating…" : "Generate Report"}
            </button>
          </form>
        </div>

        <form className="reports-search" onSubmit={(event) => { event.preventDefault(); loadReports(query.trim()); }}>
          <FiSearch />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your reports by title or keyword..." />
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
                  <span>{report.description ? report.description.substring(0, 100) + "..." : "Click to view full text report and chart data"}</span>
                </button>
                <div className="report-row-meta">
                  <span className="workspace-status">{report.status || "Ready"}</span>
                  <time>{report.period ? formatDateTime(report.period) : "Recently generated"}</time>
                </div>
                <div className="report-row-actions">
                  <button type="button" onClick={() => handleDownload(report)} aria-label={`Download ${report.title}`}><FiDownload /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(report)} aria-label={`Delete ${report.title}`}><FiTrash2 /></button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="workspace-empty">No reports found. Fill in title/keyword/topic above and click Generate Report.</div>}

        {selected && (
          <div className="report-preview-backdrop" onClick={() => setSelected(null)}>
            <article className="report-preview" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="report-preview-close" onClick={() => setSelected(null)} aria-label="Close report preview"><FiX /></button>
              <span className="catalog-kicker">Generated Analytical Report</span>
              <h2>{selected.title}</h2>
              <p className="report-preview-meta">{selected.period ? formatDateTime(selected.period) : "Recently generated"}</p>
              <div className="report-content" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.6", background: "var(--st-card-bg, #f8fafc)", padding: "16px", borderRadius: "8px", border: "1px solid var(--st-border, #e2e8f0)" }}>
                {selected.content || selected.description || "No text narrative content returned."}
              </div>
              {selected.charts && selected.charts.length > 0 && (
                <div className="report-charts">
                  {selected.charts.map((chart, index) => <ReportChart key={chart.id ?? chart.title ?? index} chart={chart} index={index} />)}
                </div>
              )}
              <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                <button type="button" className="workspace-button primary" onClick={() => handleDownload(selected)}><FiDownload /> Download text report</button>
                <button type="button" className="workspace-button danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete report</button>
              </div>
            </article>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default ReportsPage;
