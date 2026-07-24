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

function OverallStatsCard({ points }) {
  const cardThemes = [
    { bg: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", icon: "📄" },
    { bg: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)", icon: "📚" },
    { bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", icon: "🏷️" },
    { bg: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", icon: "🌐" },
    { bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", icon: "✅" },
    { bg: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", icon: "⚠️" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginTop: "14px" }}>
      {points.map((pt, idx) => {
        const theme = cardThemes[idx % cardThemes.length];
        return (
          <div key={idx} style={{ background: theme.bg, color: "#ffffff", borderRadius: "10px", padding: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, opacity: 0.92, textTransform: "capitalize" }}>{pt.label}</span>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "8px" }}>
              <span style={{ fontSize: "20px", fontWeight: 800 }}>{pt.value.toLocaleString()}</span>
              <span style={{ fontSize: "16px" }}>{theme.icon}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
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

  let linePath = "";
  if (coords.length > 0) {
    linePath = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cp1x = (curr.x + next.x) / 2;
      const cp1y = curr.y;
      const cp2x = (curr.x + next.x) / 2;
      const cp2y = next.y;
      linePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
    }
  }

  const areaPath = coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${height - padding} L ${coords[0].x.toFixed(1)},${height - padding} Z`
    : "";

  return (
    <div style={{ marginTop: "12px" }}>
      <svg width="100%" height="110" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="vibrantLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#vibrantLineGrad)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4" fill="#ffffff" stroke="#6366f1" strokeWidth="2">
            <title>{`${c.label}: ${c.value} papers`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, color: "var(--st-muted-strong, #64748b)", marginTop: "4px" }}>
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function DonutChart({ points }) {
  const sliceColors = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
  const total = points.reduce((sum, p) => sum + p.value, 0) || 1;

  const slices = points.slice(0, 5).map((p, idx) => {
    const pct = Math.round((p.value / total) * 100);
    const startPct = points
      .slice(0, idx)
      .reduce((sum, item) => sum + Math.round((item.value / total) * 100), 0);
    return {
      ...p,
      pct,
      color: sliceColors[idx % sliceColors.length],
      dashArray: `${pct * 0.999} ${100 - pct * 0.999}`,
      dashOffset: 100 - startPct + 25,
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "14px", flexWrap: "wrap" }}>
      <svg width="100" height="100" viewBox="0 0 42 42" style={{ flexShrink: 0, transform: "rotate(-90deg)", borderRadius: "50%" }}>
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="7" />
        {slices.map((slice, idx) => (
          <circle
            key={idx}
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke={slice.color}
            strokeWidth="7"
            strokeDasharray={slice.dashArray}
            strokeDashoffset={slice.dashOffset}
            style={{ transition: "all 0.4s ease" }}
          >
            <title>{`${slice.label}: ${slice.value} (${slice.pct}%)`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px", fontSize: "12px", flex: 1 }}>
        {slices.map((slice, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "var(--st-card-bg, #f8fafc)", padding: "4px 8px", borderRadius: "6px", borderLeft: `3px solid ${slice.color}` }}>
            <span style={{ fontWeight: 600, color: "var(--st-text-main, #1e293b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }} title={slice.label}>{slice.label}</span>
            <span style={{ fontWeight: 700, color: slice.color }}>{slice.value.toLocaleString()} <small style={{ opacity: 0.8 }}>({slice.pct}%)</small></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnChart({ points }) {
  const columnGradients = [
    "linear-gradient(to bottom, #6366f1, #4338ca)",
    "linear-gradient(to bottom, #06b6d4, #0891b2)",
    "linear-gradient(to bottom, #10b981, #059669)",
    "linear-gradient(to bottom, #f59e0b, #d97706)",
    "linear-gradient(to bottom, #ec4899, #be185d)",
    "linear-gradient(to bottom, #8b5cf6, #6d28d9)",
  ];
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px", marginTop: "16px", paddingBottom: "24px", position: "relative" }}>
      {points.slice(0, 6).map((p, idx) => {
        const heightPct = Math.max((p.value / max) * 100, 12);
        const bg = columnGradients[idx % columnGradients.length];
        return (
          <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--st-text-main, #0f172a)", marginBottom: "4px" }}>{p.value}</span>
            <div style={{ width: "100%", height: `${heightPct}%`, backgroundImage: bg, borderRadius: "6px 6px 0 0", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
            <span style={{ position: "absolute", bottom: "0", fontSize: "10px", fontWeight: 500, color: "var(--st-muted-strong, #64748b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45px" }} title={p.label}>{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ points }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const barGradients = [
    "linear-gradient(to right, #6366f1, #4f46e5)",
    "linear-gradient(to right, #0ea5e9, #0284c7)",
    "linear-gradient(to right, #10b981, #059669)",
    "linear-gradient(to right, #f59e0b, #d97706)",
    "linear-gradient(to right, #ec4899, #be185d)",
  ];

  return (
    <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
      {points.slice(0, 5).map((point, idx) => {
        const bg = barGradients[idx % barGradients.length];
        return (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "130px 1fr 50px", alignItems: "center", gap: "10px", fontSize: "12px" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: "var(--st-text-main, #0f172a)" }} title={point.label}>{point.label}</span>
            <div style={{ background: "var(--st-border, #e2e8f0)", height: "10px", borderRadius: "6px", overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", width: `${Math.max((point.value / max) * 100, 4)}%`, backgroundImage: bg, borderRadius: "6px" }} />
            </div>
            <strong style={{ fontSize: "12px", textAlign: "right", color: "var(--st-text-main, #0f172a)" }}>{point.value.toLocaleString()}</strong>
          </div>
        );
      })}
    </div>
  );
}

function ReportChart({ chart }) {
  const points = chartPoints(chart);
  const title = (chart.title || chart.name || "").toLowerCase();

  const chartType =
    title.includes("overall") || title.includes("statistics") || title.includes("tổng quan")
      ? "stats"
      : title.includes("year") || title.includes("năm")
        ? "line"
        : title.includes("journal") || title.includes("tạp chí")
          ? "donut"
          : title.includes("keyword") || title.includes("từ khóa")
            ? "column"
            : "bar";

  const badgeLabels = {
    stats: "KPI Metric Cards",
    line: "Time Series Curve",
    donut: "Distribution Donut",
    column: "Frequency Columns",
    bar: "Rankings & Progress",
  };

  return (
    <div className="report-chart-card" style={{ background: "var(--st-card-bg, #ffffff)", border: "1px solid var(--st-border, #cbd5e1)", borderRadius: "12px", padding: "18px", marginTop: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--st-text-main, #0f172a)" }}>{chart.title || chart.name || "Report chart"}</h4>
        <span style={{ fontSize: "11px", fontWeight: 700, background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", color: "#ffffff", padding: "3px 10px", borderRadius: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {badgeLabels[chartType] || "Chart"}
        </span>
      </div>
      {points.length > 0 ? (
        chartType === "stats" ? <OverallStatsCard points={points} /> :
        chartType === "line" ? <LineChart points={points} /> :
        chartType === "donut" ? <DonutChart points={points} /> :
        chartType === "column" ? <ColumnChart points={points} /> :
        <BarChart points={points} />
      ) : <p style={{ fontSize: "12px", color: "var(--st-text-muted)" }}>No chart data points available.</p>}
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
                  {selected.charts.map((chart, index) => <ReportChart key={chart.id ?? chart.title ?? index} chart={chart} />)}
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
