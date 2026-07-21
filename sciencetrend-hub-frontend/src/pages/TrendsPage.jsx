import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiX,
  FiPlus,
  FiLayers,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { getTrendingTopics, getTrendStats } from "../services/trendService";
import { getAllKeywords } from "../services/keywordService";
import { getDashboardOverview } from "../services/dashboardService";
import { normalizeChartPoint, normalizeKeyword, normalizeTopic, toArray, formatNumber, normalizeDashboard } from "../utils/apiData";
import { getCachedData, setCachedData } from "../utils/apiCache";
import "../styles/WorkspacePages.css";
import "../styles/TrendsPage.css";

/* ── Toast Overlay ── */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  return { toast, showToast };
}

function TrendsPage() {
  // Navigation tab: 'keyword' | 'topic'
  const [trendTab, setTrendTab] = useState("keyword");
  const [searchVal, setSearchVal] = useState("");
  
  // Keyword chips state
  const [keywordChips, setKeywordChips] = useState([]);
  // Topic chips state
  const [topicChips, setTopicChips] = useState([]);
  const [activeKeyword, setActiveKeyword] = useState("");
  const [activeTopicState, setActiveTopicState] = useState("");
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [showAddKeywordInput, setShowAddKeywordInput] = useState(false);

  // Data states from backend
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [dbKeywords, setDbKeywords] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const cacheKey = "trends_metadata_v2";
    const cached = getCachedData(cacheKey, 300000);

    function applyMetadata(metadata) {
      if (cancelled) return;
      const topics = metadata.trendingTopics ?? [];
      const keywords = metadata.dbKeywords ?? [];
      setTrendingTopics(topics);
      setDbKeywords(keywords);
      setDashboard(metadata.dashboard ?? null);
      setKeywordChips((current) => current.length > 0 ? current : keywords.slice(0, 5));
      setActiveKeyword((current) => current || keywords[0] || "");
      const topicNames = topics.map((topic) => topic.name).filter(Boolean);
      setTopicChips((current) => current.length > 0 ? current : topicNames.slice(0, 5));
      setActiveTopicState((current) => current || topicNames[0] || "");
    }

    function updateMetadata(patch) {
      const current = getCachedData(cacheKey, Number.MAX_SAFE_INTEGER) ?? cached ?? {
        trendingTopics: [],
        dbKeywords: [],
        dashboard: null,
      };
      const next = { ...current, ...patch };
      setCachedData(cacheKey, next);
      applyMetadata(next);
    }

    if (cached) {
      applyMetadata(cached);
      setMetadataLoading(false);
    }

    const metadataRequests = [
      getTrendingTopics({ limit: 10 }).then((response) => {
        updateMetadata({ trendingTopics: toArray(response).map(normalizeTopic) });
      }),
      getAllKeywords({ page: 0, size: 100 }).then((response) => {
        updateMetadata({ dbKeywords: toArray(response, ["keywords"]).map(normalizeKeyword).map((keyword) => keyword.name) });
      }),
      getDashboardOverview().then((response) => {
        updateMetadata({ dashboard: normalizeDashboard(response) });
      }),
    ];

    Promise.allSettled(metadataRequests).then((results) => {
      if (!cancelled && !cached && results.every((result) => result.status === "rejected")) {
        setErrorMessage("Could not load trend catalog data. Please try again.");
      }
    }).finally(() => {
      if (!cancelled) setMetadataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeTrendTerm = trendTab === "keyword" ? activeKeyword : activeTopicState;

  useEffect(() => {
    if (!activeTrendTerm) {
      setChartData([]);
      setChartLoading(false);
      return;
    }

    let cancelled = false;
    const normalizedTerm = activeTrendTerm.trim().toLowerCase();
    const cacheKey = `trend_series_${trendTab}_${normalizedTerm}`;
    const cached = getCachedData(cacheKey, 300000);

    if (cached) {
      setChartData(cached);
      setChartLoading(false);
      return () => {
        cancelled = true;
      };
    } else {
      setChartData([]);
      setChartLoading(true);
    }

    getTrendStats(trendTab === "keyword" ? { keyword: activeTrendTerm } : { topic: activeTrendTerm })
      .then((response) => {
        if (cancelled) return;
        const points = toArray(response).map(normalizeChartPoint);
        setChartData(points);
        setCachedData(cacheKey, points);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!cancelled && !cached) {
          setErrorMessage(error.message || "Could not load the selected trend series.");
        }
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTrendTerm, trendTab]);

  // Chip management
  function handleAddChip(e) {
    e.preventDefault();
    const val = newKeywordInput.trim();
    if (trendTab === "keyword") {
      if (val && !keywordChips.includes(val)) {
        setKeywordChips((curr) => [...curr, val]);
        setActiveKeyword(val);
        setNewKeywordInput("");
        setShowAddKeywordInput(false);
        showToast(`Added keyword trace: "${val}"`, "success");
      }
    } else {
      if (val && !topicChips.includes(val)) {
        setTopicChips((curr) => [...curr, val]);
        setActiveTopicState(val);
        setNewKeywordInput("");
        setShowAddKeywordInput(false);
        showToast(`Added topic trace: "${val}"`, "success");
      }
    }
  }

  function handleRemoveChip(chipToRemove) {
    if (trendTab === "keyword") {
      setKeywordChips((curr) => {
        const next = curr.filter((c) => c !== chipToRemove);
        if (activeKeyword === chipToRemove) {
          setActiveKeyword(next[0] || "");
        }
        return next;
      });
      showToast(`Removed keyword trace: "${chipToRemove}"`, "info");
    } else {
      setTopicChips((curr) => {
        const next = curr.filter((c) => c !== chipToRemove);
        if (activeTopicState === chipToRemove) {
          setActiveTopicState(next[0] || "");
        }
        return next;
      });
      showToast(`Removed topic trace: "${chipToRemove}"`, "info");
    }
  }

  function handleClearAllChips() {
    if (trendTab === "keyword") {
      setKeywordChips([]);
      setActiveKeyword("");
      showToast("Cleared keyword traces.", "info");
    } else {
      setTopicChips([]);
      setActiveTopicState("");
      showToast("Cleared topic traces.", "info");
    }
  }

  // Calculate dynamic SVG Area Chart path (Publication Count by Year)
  const areaChartPathData = useMemo(() => {
    const safeChartData = Array.isArray(chartData) ? chartData : [];
    const points = safeChartData.map((pt) => pt?.value ?? 0);
    
    const width = 380;
    const height = 120;
    const padding = 10;
    
    if (points.length === 0) {
      return { linePath: "", areaPath: "", coords: [], points: [] };
    }
    
    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, 0);
    const range = maxVal - minVal || 1;
    
    const coords = points.map((val, idx) => {
      const denominator = points.length > 1 ? points.length - 1 : 1;
      const x = padding + (idx * (width - 2 * padding)) / denominator;
      const y = height - padding - ((val - minVal) * (height - 2 * padding)) / range;
      return { x, y, value: val, label: safeChartData[idx]?.label || "" };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const areaPath = coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} L ${coords[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`
      : "";

    return { linePath, areaPath, coords, points };
  }, [chartData]);

  const comparisonLines = useMemo(() => {
    const years = [...new Set(chartData.map((point) => Number(point.label)).filter(Number.isFinite))].sort((a, b) => a - b);
    const width = 380;
    const height = 120;
    const padding = 10;

    const activeChips = trendTab === "keyword" ? keywordChips : topicChips;
    const safeActiveChips = Array.isArray(activeChips) ? activeChips : [];
    const safeChartData = Array.isArray(chartData) ? chartData : [];
    
    if (safeActiveChips.length === 0 || safeChartData.length === 0) return [];

    const yearValuesMap = {};
    safeChartData.forEach(pt => {
      if (pt) {
        yearValuesMap[String(pt.label)] = pt.value;
      }
    });

    const values = years.map(yr => yearValuesMap[String(yr)] || 0);
    const maxVal = Math.max(...values, 10);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const dataset = [
      { label: safeActiveChips[0] || "Topic 1", stroke: "#5e6ad2", values }
    ];

    return dataset.map((line, lineIdx) => {
      const coords = line.values.map((val, idx) => {
        const denominator = years.length > 1 ? years.length - 1 : 1;
        const x = padding + (idx * (width - 2 * padding)) / denominator;
        const y = height - padding - ((val - minVal) * (height - 2 * padding)) / range;
        return { x, y };
      });

      const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

      return {
        label: safeActiveChips[lineIdx] || line.label,
        stroke: line.stroke,
        linePath,
        coords
      };
    });
  }, [trendTab, keywordChips, topicChips, chartData]);

  const annualGrowth = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = Number(chartData[0]?.value) || 0;
    const last = Number(chartData[chartData.length - 1]?.value) || 0;
    if (first <= 0) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  return (
    <MainLayout title="Trends & Topics" subtitle="Discover emerging research trends and topic evolution">
      <div className="trends-page-container">
        {errorMessage && <div className="workspace-notice warning">{errorMessage}</div>}
        {(metadataLoading || chartLoading) && (
          <div className="trends-loading-notice" role="status" aria-live="polite">
            <span className="workspace-loading-spinner" />
            <span>{metadataLoading ? "Loading trend catalog…" : `Updating ${trendTab} chart…`}</span>
          </div>
        )}
        {toast && <div className={`papers-toast papers-toast--${toast.type}`}>{toast.message}</div>}
        
        {/* Sub-toolbar for filters, search, and switch tab buttons */}
        <div className="trends-controls-bar">
          <div className="trends-tab-buttons-group">
            <button
              type="button"
              className={`trends-btn-toggle ${trendTab === "keyword" ? "active" : ""}`}
              onClick={() => setTrendTab("keyword")}
            >
              Keyword Trend
            </button>
            <button
              type="button"
              className={`trends-btn-toggle ${trendTab === "topic" ? "active" : ""}`}
              onClick={() => setTrendTab("topic")}
            >
              Topic Trend
            </button>
          </div>

          <div className="trends-filter-inputs-group">
            <div className="trends-search-box-wrap">
              <FiSearch />
              <input
                type="text"
                placeholder={trendTab === "keyword" ? "Search keywords..." : "Search topics..."}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                list={trendTab === "keyword" ? "trend-keyword-options" : undefined}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || !searchVal.trim()) return;
                  event.preventDefault();
                  if (trendTab === "keyword") {
                    setActiveKeyword(searchVal.trim());
                    setKeywordChips((current) => current.includes(searchVal.trim()) ? current : [...current, searchVal.trim()]);
                  } else {
                    setActiveTopicState(searchVal.trim());
                    setTopicChips((current) => current.includes(searchVal.trim()) ? current : [...current, searchVal.trim()]);
                  }
                }}
              />
              <datalist id="trend-keyword-options">{dbKeywords.map((keyword) => <option key={keyword} value={keyword} />)}</datalist>
            </div>

            {searchVal && (
              <button
                type="button"
                className="trends-clear-filters-link"
                onClick={() => setSearchVal("")}
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Dynamic active chips */}
        <div className="trends-keyword-chips-row">
          {(trendTab === "keyword" ? keywordChips : topicChips).map((chip, idx) => {
            const isSelected = trendTab === "keyword" 
              ? activeKeyword === chip 
              : activeTopicState === chip;
            return (
              <span 
                key={idx} 
                className={`trends-keyword-chip chip-color-${idx % 5} ${isSelected ? "active" : ""}`}
                onClick={() => {
                  if (trendTab === "keyword") {
                    setActiveKeyword(chip);
                  } else {
                    setActiveTopicState(chip);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <span className="dot" />
                <span className="label-text" style={{ fontWeight: isSelected ? "bold" : "normal" }}>{chip}</span>
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveChip(chip);
                  }}
                >
                  <FiX />
                </button>
              </span>
            );
          })}

          {showAddKeywordInput ? (
            <form onSubmit={handleAddChip} className="trends-add-chip-form">
              <input
                type="text"
                autoFocus
                placeholder={trendTab === "keyword" ? "Type keyword..." : "Type topic..."}
                value={newKeywordInput}
                onChange={(e) => setNewKeywordInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowAddKeywordInput(false), 250)}
              />
            </form>
          ) : (
            <button
              type="button"
              className="trends-add-keyword-trigger-btn"
              onClick={() => setShowAddKeywordInput(true)}
            >
              <FiPlus />
              <span>{trendTab === "keyword" ? "Add keyword" : "Add topic"}</span>
            </button>
          )}

          {(trendTab === "keyword" ? keywordChips : topicChips).length > 0 && (
            <button type="button" className="trends-clear-chips-btn" onClick={handleClearAllChips}>
              Clear all
            </button>
          )}
        </div>

        {/* 4 Stats Cards row */}
        <div className="trends-stats-cards-row">
          <div className="trend-stat-card">
            <span className="stat-card-label">Total Publications</span>
            <h3 className="stat-card-value">
              {dashboard ? formatNumber(dashboard.totalPapers) : "0"}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">Live catalog total</span>
            </span>
          </div>
          <div className="trend-stat-card">
            <span className="stat-card-label">Avg. Annual Growth</span>
            <h3 className="stat-card-value">
              {annualGrowth === null ? "—" : `${annualGrowth >= 0 ? "+" : ""}${annualGrowth.toFixed(1)}%`}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">Across the selected series</span>
            </span>
          </div>
          <div className="trend-stat-card">
            <span className="stat-card-label">Emerging Topics</span>
            <h3 className="stat-card-value">
              {dashboard ? formatNumber(dashboard.totalKeywords) : "0"}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">Indexed keywords</span>
            </span>
          </div>
          <div className="trend-stat-card">
            <span className="stat-card-label">Breakout Topics</span>
            <h3 className="stat-card-value">
              {trendingTopics.length}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">Returned by the trends API</span>
            </span>
          </div>
        </div>

        {/* Middle row: Area chart, lines comparison chart, top trending table */}
        <div className="trends-middle-grid">
          
          {/* Card 1: Area Chart */}
          <article className="trends-chart-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Publication Count by Year</h3>
              <span className="badge-chip">Yearly</span>
            </div>
            <div className="trends-svg-chart-container">
              {areaChartPathData.points.length > 0 ? (
                <>
                  <svg viewBox="0 0 380 120" className="trends-svg-chart">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#5e6ad2" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d={areaChartPathData.areaPath} fill="url(#areaGrad)" />
                    <path d={areaChartPathData.linePath} fill="none" stroke="#5e6ad2" strokeWidth="2.5" strokeLinecap="round" />
                    {areaChartPathData.coords.map((c, i) => (
                      <circle 
                        key={i} 
                        cx={c.x} 
                        cy={c.y} 
                        r="3.5" 
                        fill="#ffffff" 
                        stroke="#5e6ad2" 
                        strokeWidth="1.5"
                        tabIndex="0"
                        role="img"
                        aria-label={`Năm ${c.label}: ${c.value} bài báo`}
                        style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                        className="trend-chart-point"
                      />
                    ))}
                  </svg>
                  <div className="trends-chart-axis-x">
                    <span>2015</span>
                    <span>2020</span>
                    <span>2025</span>
                  </div>
                </>
              ) : (
                <div className="chart-empty-placeholder" style={{ display: "grid", placeItems: "center", width: "100%", height: "100px", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No yearly publication data found.
                </div>
              )}
            </div>
            <p className="trends-chart-subtext">
              {areaChartPathData.points.length > 0 
                ? `The number of publications ranges across annual distribution trends.`
                : "No publication statistics recorded in the database yet."}
            </p>
          </article>

          {/* Card 2: Keyword/Topic Comparison */}
          <article className="trends-chart-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Keyword/Topic Comparison</h3>
              <span className="badge-chip">Cumulative</span>
            </div>
            <div className="trends-svg-chart-container">
              {comparisonLines.length > 0 ? (
                <>
                  <svg viewBox="0 0 380 120" className="trends-svg-chart">
                    {comparisonLines.map((line, idx) => (
                      <g key={idx}>
                        <path
                          d={line.linePath}
                          fill="none"
                          stroke={line.stroke}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        {line.coords.map((c, i) => (
                          <circle key={i} cx={c.x} cy={c.y} r="2.5" fill="#ffffff" stroke={line.stroke} strokeWidth="1" />
                        ))}
                      </g>
                    ))}
                  </svg>
                  <div className="trends-chart-axis-x">
                    <span>2015</span>
                    <span>2020</span>
                    <span>2025</span>
                  </div>
                  <div className="comparison-legend-row">
                    {comparisonLines.map((line, idx) => (
                      <span key={idx} className="legend-chip-item">
                        <span className="dot" style={{ backgroundColor: line.stroke }} />
                        <span className="label">{line.label.length > 8 ? line.label.substring(0, 7) + ".." : line.label}</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="chart-empty-placeholder" style={{ display: "grid", placeItems: "center", width: "100%", height: "100px", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No comparative data available.
                </div>
              )}
            </div>
          </article>

          {/* Card 3: Top Trending Topics list */}
          <article className="trends-table-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "Top Trending Keywords" : "Top Trending Topics"}</h3>
              <span className="badge-chip">Top 5</span>
            </div>
            <div className="trends-compact-table-wrap">
              <table className="trends-compact-table">
                <thead>
                  <tr>
                    <th>{trendTab === "keyword" ? "Keyword" : "Topic"}</th>
                    <th>Publications</th>
                    <th>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {trendingTopics.slice(0, 5).map((topic, idx) => (
                    <tr key={topic.id}>
                      <td>
                        <div className="trends-topic-cell">
                          <span className="rank-num">{idx + 1}</span>
                          <span className="topic-name">{topic.name}</span>
                        </div>
                      </td>
                      <td>{typeof topic.paperCount === "string" ? topic.paperCount.split(" ")[0] : (topic.paperCount ?? "0")}</td>
                    <td className="positive">{topic.growth || "—"}</td>
                    </tr>
                  ))}
                  {trendingTopics.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", padding: "30px 0", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                        No trending data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

        </div>

        {/* Bottom row: Top Growing list, Topic Momentum list, Insights text boxes */}
        <div className="trends-bottom-grid">
          
          {/* Card 1: Top Growing Topics */}
          <article className="trends-bottom-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "Top Growing Keywords (by Growth)" : "Top Growing Topics (by Growth)"}</h3>
              <span className="badge-chip">Growth</span>
            </div>
            <div className="trends-sparkline-list">
              {trendingTopics.slice(0, 3).map((topic) => (
                <div key={topic.id} className="trends-sparkline-row">
                  <div className="topic-rank-name">
                    <span className="bullet-dot" />
                    <span className="name">{topic.name}</span>
                  </div>
                  <div className="sparkline-stats">
                  <span className="growth-text">{topic.growth || "—"}</span>
                  </div>
                </div>
              ))}
              {trendingTopics.length === 0 && (
                <div className="chart-empty-placeholder" style={{ padding: "30px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No growth data.
                </div>
              )}
            </div>
          </article>

          {/* Card 2: Topic Momentum (Acceleration) */}
          <article className="trends-bottom-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "More Active Keywords" : "More Active Topics"}</h3>
              <span className="badge-chip">Activity</span>
            </div>
            <div className="trends-sparkline-list">
              {trendingTopics.slice(3, 6).map((topic) => (
                <div key={topic.id} className="trends-sparkline-row">
                  <div className="topic-rank-name">
                    <span className="bullet-dot bg-blue" />
                    <span className="name">{topic.name}</span>
                  </div>
                  <div className="sparkline-stats">
                    <span className="momentum-score">{topic.paperCount || "—"}</span>
                  </div>
                </div>
              ))}
              {trendingTopics.length === 0 && (
                <div className="chart-empty-placeholder" style={{ padding: "30px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No momentum data.
                </div>
              )}
            </div>
          </article>

          {/* Card 3: concise summaries from returned trend values */}
          <article className="trends-bottom-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "Analytical Keyword Insights" : "Analytical Topic Insights"}</h3>
              <span className="badge-chip bg-orange">Insights</span>
            </div>
            <div className="trends-insights-scroll-list">
              {trendingTopics.length > 0 ? (
                trendingTopics.slice(0, 3).map((t, idx) => (
                  <div key={idx} className="insight-card-item">
                    <div className="insight-icon-circle green">
                      <FiLayers />
                    </div>
                    <p>
                      <strong>{t.name}</strong> has {t.paperCount || "no paper count"}; reported growth is {t.growth || "not available"}.
                    </p>
                  </div>
                ))
              ) : (
                <div className="chart-empty-placeholder" style={{ padding: "40px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No scientific trend data is available.
                </div>
              )}
            </div>
          </article>

        </div>

      </div>
    </MainLayout>
  );
}

export default TrendsPage;
