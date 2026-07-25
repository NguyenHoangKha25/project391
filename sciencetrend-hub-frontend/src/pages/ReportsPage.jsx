import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiDownload,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
  FiZap,
  FiFileText,
  FiTag,
  FiLayers,
  FiClock,
  FiFile,
  FiSliders,
  FiCheckCircle,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { deleteReport, generateReport, getReports, searchReports } from "../services/reportService";
import { formatDateTime, normalizeReport, toArray } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/ReportsPage.css";

const QUICK_PRESETS = [
  {
    label: "🤖 AI & Machine Learning",
    title: "AI & Machine Learning Trend Report 2026",
    keyword: "Artificial Intelligence",
    topic: "Machine Learning",
  },
  {
    label: "⚡ Deep Learning & LLMs",
    title: "Deep Learning & LLM Research Analysis",
    keyword: "Transformer",
    topic: "Natural Language Processing",
  },
  {
    label: "🌐 Neural Networks",
    title: "Neural Networks & Computer Vision Report",
    keyword: "Neural Networks",
    topic: "Advanced Neural Network Applications",
  },
  {
    label: "📊 High-Impact Papers",
    title: "Global Scientific Journal Analytics 2026",
    keyword: "Deep Learning",
    topic: "Topic Modeling",
  },
];

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
  const filteredPoints = points.filter((pt) => {
    const lbl = String(pt.label || "").toLowerCase();
    return !lbl.includes("sync") && !lbl.includes("successful") && !lbl.includes("failed");
  });

  const themes = [
    { bg: "#f0f4ff", border: "#6366f1", text: "#3730a3", icon: "📄" },
    { bg: "#ecfeff", border: "#06b6d4", text: "#085d6e", icon: "📚" },
    { bg: "#ecfdf5", border: "#10b981", text: "#065f46", icon: "🏷️" },
    { bg: "#f5f3ff", border: "#8b5cf6", text: "#5b21b6", icon: "🌐" },
  ];

  return (
    <div className="overall-stats-grid">
      {filteredPoints.map((pt, idx) => {
        const theme = themes[idx % themes.length];
        return (
          <div
            key={idx}
            className="stat-card-glass"
            style={{
              backgroundColor: theme.bg,
              borderLeft: `4px solid ${theme.border}`,
            }}
          >
            <div className="stat-card-top">
              <span className="stat-card-title">{pt.label}</span>
              <span className="stat-card-emoji">{theme.icon}</span>
            </div>
            <h3 className="stat-card-num" style={{ color: theme.text }}>
              {pt.value.toLocaleString()}
            </h3>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ points }) {
  const max = Math.max(...points.map((p) => p.value), 10);
  const width = 380;
  const height = 130;
  const padding = 18;
  
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
    <div className="line-chart-wrapper">
      <svg width="100%" height="130" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <path d={areaPath} fill="url(#lineAreaGrad)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" filter="url(#glowEffect)" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4.5" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" className="chart-dot-point">
            <title>{`${c.label}: ${c.value.toLocaleString()} papers`}</title>
          </circle>
        ))}
      </svg>
      <div className="chart-axis-ticks">
        <span>{points[0]?.label}</span>
        <span>{points[Math.floor(points.length / 2)]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function ColumnChart({ points }) {
  const columnGradients = [
    "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
    "linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%)",
    "linear-gradient(180deg, #10b981 0%, #059669 100%)",
    "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
    "linear-gradient(180deg, #ec4899 0%, #be185d 100%)",
    "linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)",
  ];
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="column-chart-wrapper">
      {points.slice(0, 6).map((p, idx) => {
        const heightPct = Math.max((p.value / max) * 100, 10);
        const bg = columnGradients[idx % columnGradients.length];
        return (
          <div key={idx} className="column-bar-item">
            <span className="column-val-tag">{p.value > 999 ? `${(p.value/1000).toFixed(1)}k` : p.value}</span>
            <div className="column-track-bg">
              <div
                className="column-fill-bar"
                style={{ height: `${heightPct}%`, background: bg }}
              />
            </div>
            <span className="column-label-text" title={p.label}>{p.label}</span>
          </div>
        );
      })}
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
    <div className="donut-chart-container">
      <div className="donut-svg-center-wrap">
        <svg width="110" height="110" viewBox="0 0 42 42" className="donut-svg">
          <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="6"
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              className="donut-segment-ring"
            >
              <title>{`${slice.label}: ${slice.value.toLocaleString()} (${slice.pct}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="donut-center-label">
          <strong>{total.toLocaleString()}</strong>
          <span>Total</span>
        </div>
      </div>

      <div className="donut-legend-grid">
        {slices.map((slice, idx) => (
          <div key={idx} className="donut-legend-item">
            <span className="dot-indicator" style={{ backgroundColor: slice.color }} />
            <span className="legend-name" title={slice.label}>{slice.label}</span>
            <span className="legend-val-badge" style={{ color: slice.color, backgroundColor: `${slice.color}15` }}>
              {slice.pct}% ({slice.value.toLocaleString()})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportChart({ chart }) {
  const points = chartPoints(chart);
  const title = (chart.title || chart.name || "").toLowerCase();

  const chartType =
    title.includes("overall") || title.includes("statistics") || title.includes("tổng quan")
      ? "stats"
      : title.includes("year") || title.includes("năm") || title.includes("time")
        ? "line"
        : title.includes("journal") || title.includes("tạp chí") || title.includes("distribution")
          ? "donut"
          : title.includes("keyword") || title.includes("từ khóa")
            ? "column"
            : "line";

  const badgeLabels = {
    stats: "KPI Metric Cards",
    line: "Time Series Curve",
    donut: "Distribution Donut",
    column: "Frequency Columns",
  };

  const badgeColors = {
    stats: "badge-indigo",
    line: "badge-blue",
    donut: "badge-cyan",
    column: "badge-emerald",
  };

  return (
    <article className="report-chart-card glass-panel">
      <div className="chart-card-header">
        <h4>{chart.title || chart.name || "Report Analytics Chart"}</h4>
        <span className={`badge-chip ${badgeColors[chartType] || "badge-indigo"}`}>
          {badgeLabels[chartType] || "Analytics"}
        </span>
      </div>

      {points.length > 0 ? (
        chartType === "stats" ? <OverallStatsCard points={points} /> :
        chartType === "line" ? <LineChart points={points} /> :
        chartType === "donut" ? <DonutChart points={points} /> :
        <ColumnChart points={points} />
      ) : (
        <p className="chart-empty-msg">No chart data points available.</p>
      )}
    </article>
  );
}

function ReportFormattedNarrative({ content }) {
  if (!content) return <div className="report-empty-content">No report narrative available.</div>;

  // Normalize string by inserting line breaks before section numbers like "1. Overall", "2. Papers", "3. Top", "4. Top", "7. Top"
  const normalizedStr = content
    .replace(/(\d+\.\s+[A-Za-z\s]+)/g, "\n$1\n")
    .replace(/\s+-\s+/g, "\n- ");

  const lines = normalizedStr.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let currentSec = { title: "", items: [] };

  lines.forEach((line) => {
    if (/^\d+\.\s+/.test(line)) {
      if (currentSec.title || currentSec.items.length > 0) {
        sections.push(currentSec);
      }
      currentSec = { title: line.replace(/^\d+\.\s+/, ""), items: [] };
    } else if (line.toUpperCase().includes("REPORT") && line.length < 80) {
      if (currentSec.title || currentSec.items.length > 0) {
        sections.push(currentSec);
      }
      currentSec = { title: line, items: [] };
    } else {
      currentSec.items.push(line);
    }
  });
  if (currentSec.title || currentSec.items.length > 0) {
    sections.push(currentSec);
  }

  return (
    <div className="report-formatted-narrative">
      {sections.map((sec, idx) => {
        const secTitle = sec.title.trim();
        const items = sec.items;

        return (
          <div key={idx} className="narrative-section-box">
            {secTitle && (
              <div className="narrative-section-header">
                <span className="narrative-sec-badge">{idx + 1}</span>
                <h4>{secTitle}</h4>
              </div>
            )}
            <div className="narrative-items-grid">
              {items
                .filter((item) => {
                  const lower = item.toLowerCase();
                  return !lower.includes("sync") && !lower.includes("successful") && !lower.includes("failed");
                })
                .map((item, itemIdx) => {
                  const clean = item.replace(/^-\s*/, "");
                  const parts = clean.split(":");
                  const label = parts[0]?.trim();
                  const value = parts.slice(1).join(":")?.trim();

                  return (
                    <div key={itemIdx} className="narrative-item-chip">
                      <span className="item-label">{label}</span>
                      {value && <strong className="item-val">{value}</strong>}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [reportKeyword, setReportKeyword] = useState("");
  const [reportTopic, setReportTopic] = useState("");
  const [reportHorizon, setReportHorizon] = useState("8y");
  const [exportFormat, setExportFormat] = useState("txt");
  const [selected, setSelected] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadReports = useCallback(async (searchQuery = "") => {
    try {
      setLoading(true);
      setErrorMessage("");
      const raw = searchQuery ? await searchReports(searchQuery) : await getReports();
      setReports(toArray(raw).map(normalizeReport));
    } catch (err) {
      console.error("Failed to load reports", err);
      setErrorMessage("Could not load scientific reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleCreateReport(event) {
    event.preventDefault();
    if (!reportTitle.trim()) return;

    try {
      setCreating(true);
      setErrorMessage("");
      const payload = {
        title: reportTitle.trim(),
        keyword: reportKeyword.trim() || undefined,
        topic: reportTopic.trim() || undefined,
      };
      await generateReport(payload);
      setReportTitle("");
      setReportKeyword("");
      setReportTopic("");
      setShowCreateModal(false);
      await loadReports();
    } catch (err) {
      console.error("Failed to generate report", err);
      setErrorMessage("Could not generate report. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(report) {
    if (!window.confirm(`Delete "${report.title}"?`)) return;
    try {
      setErrorMessage("");
      await deleteReport(report.id);
      if (selected?.id === report.id) setSelected(null);
      await loadReports();
    } catch (err) {
      console.error("Failed to delete report", err);
      setErrorMessage("Could not delete report.");
    }
  }

  function handleDownload(report) {
    if (!report?.content) {
      alert("No downloadable content available for this report.");
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
        <div className="reports-summary-banner">
          <div className="summary-left-info">
            <span className="catalog-kicker">Research Intelligence</span>
            <h2>My Reports Catalog</h2>
            <p>{readyCount} ready · {reports.length} total generated reports</p>
          </div>
          <div className="summary-right-actions">
            <button
              type="button"
              className="reports-trigger-create-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Generate New Report
            </button>
          </div>
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
                  <span>{report.description ? report.description.substring(0, 110) + "..." : "Click to view analytical report breakdown & charts"}</span>
                </button>
                <div className="report-row-meta">
                  <span className="workspace-status">{report.status || "Ready"}</span>
                  <time>{report.period ? formatDateTime(report.period) : "Recently generated"}</time>
                </div>
                <div className="report-row-actions">
                  <button type="button" onClick={() => handleDownload(report)} aria-label={`Download ${report.title}`} title="Download Report"><FiDownload /></button>
                  <button type="button" className="danger" onClick={() => handleDelete(report)} aria-label={`Delete ${report.title}`} title="Delete Report"><FiTrash2 /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <p>No reports found.</p>
            <button type="button" className="reports-trigger-create-btn" onClick={() => setShowCreateModal(true)} style={{ marginTop: "12px" }}>
              <FiPlus /> Generate Your First Report
            </button>
          </div>
        )}

        {/* ── CREATE REPORT MODAL ── */}
        {showCreateModal && (
          <div className="report-create-modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div className="report-create-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-gradient">
                <div className="header-title-group">
                  <div className="header-icon-badge">
                    <FiZap />
                  </div>
                  <div>
                    <h3>Generate Analytical Report</h3>
                    <p>Compile custom research trends, citation analytics & topic intelligence</p>
                  </div>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                  <FiX />
                </button>
              </div>

              <div className="modal-body-content">
                {/* Quick Presets row */}
                <div className="presets-section">
                  <span className="section-mini-label"><FiSliders /> Quick Presets</span>
                  <div className="preset-chips-wrap">
                    {QUICK_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => {
                          setReportTitle(preset.title);
                          setReportKeyword(preset.keyword);
                          setReportTopic(preset.topic);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleCreateReport}>
                  <div className="modal-form-group">
                    <label><FiFileText /> Report Title *</label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="e.g. AI & Deep Learning Research Trend Report 2026"
                      required
                    />
                  </div>

                  <div className="modal-form-grid-2">
                    <div className="modal-form-group">
                      <label><FiTag /> Filter Keyword (Optional)</label>
                      <input
                        type="text"
                        value={reportKeyword}
                        onChange={(e) => setReportKeyword(e.target.value)}
                        placeholder="e.g. Transformer, Neural Networks"
                      />
                    </div>
                    <div className="modal-form-group">
                      <label><FiLayers /> Filter Topic (Optional)</label>
                      <input
                        type="text"
                        value={reportTopic}
                        onChange={(e) => setReportTopic(e.target.value)}
                        placeholder="e.g. Topic Modeling, Computer Vision"
                      />
                    </div>
                  </div>

                  <div className="modal-form-grid-2">
                    <div className="modal-form-group">
                      <label><FiClock /> Time Horizon</label>
                      <select value={reportHorizon} onChange={(e) => setReportHorizon(e.target.value)}>
                        <option value="8y">Recent 8 Years (Recommended)</option>
                        <option value="5y">Recent 5 Years</option>
                        <option value="3y">Recent 3 Years</option>
                      </select>
                    </div>
                    <div className="modal-form-group">
                      <label><FiFile /> Preferred Export Format</label>
                      <div className="export-format-radio-group">
                        <label className="radio-pill active">
                          <input type="radio" name="fmt" value="txt" checked readOnly />
                          📄 TXT Text File (.txt)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer-actions">
                    <button type="button" className="modal-btn-cancel" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="modal-btn-submit-primary" disabled={creating || !reportTitle.trim()}>
                      {creating ? (
                        <><span className="workspace-loading-spinner" /> Compiling Report…</>
                      ) : (
                        <><FiZap /> Generate Analytical Report</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW REPORT MODAL ── */}
        {selected && (
          <div className="report-preview-backdrop" onClick={() => setSelected(null)}>
            <article className="report-preview" onClick={(event) => event.stopPropagation()}>
              <div className="preview-modal-header">
                <div>
                  <span className="catalog-kicker">Generated Analytical Report</span>
                  <h2>{selected.title}</h2>
                  <p className="report-preview-meta">{selected.period ? formatDateTime(selected.period) : "Recently generated"}</p>
                </div>
                <button type="button" className="report-preview-close" onClick={() => setSelected(null)} aria-label="Close report preview"><FiX /></button>
              </div>



              <div className="report-content-card">
                <ReportFormattedNarrative content={selected.content || selected.description} />
              </div>

              {selected.charts && selected.charts.length > 0 && (
                <div className="report-charts">
                  {selected.charts.map((chart, index) => <ReportChart key={chart.id ?? chart.title ?? index} chart={chart} />)}
                </div>
              )}

              <div className="preview-modal-footer">
                <button type="button" className="workspace-button primary" onClick={() => handleDownload(selected)}><FiDownload /> Download Report</button>
                <button type="button" className="workspace-button danger" onClick={() => handleDelete(selected)}><FiTrash2 /> Delete Report</button>
              </div>
            </article>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default ReportsPage;
