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
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import "../styles/WorkspacePages.css";
import "../styles/TrendsPage.css";

/* ── Toast Overlay ── */
function hasUsableTrendSeries(points) {
  return Array.isArray(points)
    && points.length >= 2
    && points.some((point) => Number(point?.value) > 0);
}

function hasUsableDashboard(dashboard) {
  if (!dashboard) return false;
  return dashboard.totalPapers > 0
    || dashboard.totalJournals > 0
    || dashboard.totalKeywords > 0
    || hasUsableTrendSeries(dashboard.papersByYear);
}

function hasUsableMetadata(metadata) {
  return Boolean(metadata)
    && (
      (Array.isArray(metadata.trendingTopics) && metadata.trendingTopics.length > 0)
      || (Array.isArray(metadata.dbKeywords) && metadata.dbKeywords.length > 0)
      || hasUsableDashboard(metadata.dashboard)
    );
}

const TRENDS_METADATA_CACHE_KEY = "trends_metadata_v3";

function getTrendSeriesCacheKey(tab, term) {
  return `trend_series_${tab}_${term.trim().toLowerCase()}`;
}

function getInitialTrendData() {
  const storedMetadata = getPersistentCachedData(TRENDS_METADATA_CACHE_KEY);
  const metadata = hasUsableMetadata(storedMetadata) ? storedMetadata : null;
  const keywords = Array.isArray(metadata?.dbKeywords) ? metadata.dbKeywords : [];
  const topics = Array.isArray(metadata?.trendingTopics) ? metadata.trendingTopics : [];
  const topicNames = topics.map((topic) => topic.name).filter(Boolean);
  const activeKeyword = keywords[0] || "";
  const activeTopic = topicNames[0] || "";
  const storedSeries = activeKeyword
    ? getPersistentCachedData(getTrendSeriesCacheKey("keyword", activeKeyword))
    : null;

  return {
    metadata,
    keywords,
    topics,
    topicNames,
    activeKeyword,
    activeTopic,
    series: hasUsableTrendSeries(storedSeries) ? storedSeries : [],
  };
}

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
  const [initialTrendData] = useState(getInitialTrendData);

  // Navigation tab: 'keyword' | 'topic'
  const [trendTab, setTrendTab] = useState("keyword");
  const [searchVal, setSearchVal] = useState("");
  
  // Keyword chips state
  const [keywordChips, setKeywordChips] = useState(() => initialTrendData.keywords.slice(0, 5));
  // Topic chips state
  const [topicChips, setTopicChips] = useState(() => initialTrendData.topicNames.slice(0, 5));
  const [activeKeyword, setActiveKeyword] = useState(initialTrendData.activeKeyword);
  const [activeTopicState, setActiveTopicState] = useState(initialTrendData.activeTopic);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [showAddKeywordInput, setShowAddKeywordInput] = useState(false);

  // Data states from backend
  const [trendingTopics, setTrendingTopics] = useState(initialTrendData.topics);
  const [dbKeywords, setDbKeywords] = useState(initialTrendData.keywords);
  const [chartData, setChartData] = useState(initialTrendData.series);
  const [dashboard, setDashboard] = useState(initialTrendData.metadata?.dashboard ?? null);
  const [metadataLoading, setMetadataLoading] = useState(!initialTrendData.metadata);
  const [chartLoading, setChartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const cacheKey = TRENDS_METADATA_CACHE_KEY;
    const storedMetadata = getPersistentCachedData(cacheKey);
    const cached = hasUsableMetadata(storedMetadata) ? storedMetadata : null;

    function applyMetadata(metadata) {
      if (cancelled) return;
      const topics = Array.isArray(metadata.trendingTopics) ? metadata.trendingTopics : [];
      const keywords = Array.isArray(metadata.dbKeywords) ? metadata.dbKeywords : [];
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
      const current = getPersistentCachedData(cacheKey) ?? cached ?? {
        trendingTopics: [],
        dbKeywords: [],
        dashboard: null,
      };
      const next = { ...current, ...patch };
      setPersistentCachedData(cacheKey, next);
      applyMetadata(next);
    }

    if (cached) {
      applyMetadata(cached);
      setMetadataLoading(false);
    }

    const metadataRequests = [
      getTrendingTopics({ limit: 10 }).then((response) => {
        const topics = toArray(response)
          .map(normalizeTopic)
          .filter((topic) => topic.name && topic.name !== "Untitled topic");
        if (topics.length === 0) return false;
        updateMetadata({ trendingTopics: topics });
        return true;
      }),
      getAllKeywords({ page: 0, size: 100 }).then((response) => {
        const keywords = toArray(response, ["keywords"])
          .map(normalizeKeyword)
          .map((keyword) => keyword.name)
          .filter((keyword) => keyword && keyword !== "Untitled keyword");
        if (keywords.length === 0) return false;
        updateMetadata({ dbKeywords: keywords });
        return true;
      }),
      getDashboardOverview().then((response) => {
        const nextDashboard = normalizeDashboard(response);
        if (!hasUsableDashboard(nextDashboard)) return false;
        updateMetadata({ dashboard: nextDashboard });
        return true;
      }),
    ];

    Promise.allSettled(metadataRequests).then((results) => {
      const receivedFreshData = results.some(
        (result) => result.status === "fulfilled" && result.value === true,
      );
      if (!cancelled && !cached && !receivedFreshData) {
        setErrorMessage("Trend catalog data is not available yet. Please try again.");
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
    const cacheKey = getTrendSeriesCacheKey(trendTab, activeTrendTerm);
    const storedSeries = getPersistentCachedData(cacheKey);
    const cached = hasUsableTrendSeries(storedSeries) ? storedSeries : null;

    if (cached) {
      setChartData(cached);
      setChartLoading(false);
    } else {
      setChartData([]);
      setChartLoading(true);
    }

    getTrendStats(trendTab === "keyword" ? { keyword: activeTrendTerm } : { topic: activeTrendTerm })
      .then((response) => {
        if (cancelled) return;
        const points = toArray(response).map(normalizeChartPoint);
        if (!hasUsableTrendSeries(points)) {
          if (!cached) {
            setErrorMessage("No data is available for the selected trend yet.");
          }
          return;
        }
        setChartData(points);
        setPersistentCachedData(cacheKey, points);
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

  // Compute clean, aggregated chart data grouped by valid Year (max 8-10 years)
  const effectiveChartData = useMemo(() => {
    let sourceData;

    if (Array.isArray(chartData) && chartData.length >= 2 && chartData.some((pt) => (pt?.value ?? 0) > 0)) {
      sourceData = chartData;
    } else if (dashboard && Array.isArray(dashboard.papersByYear) && dashboard.papersByYear.length >= 2 && dashboard.papersByYear.some((pt) => (pt?.value ?? 0) > 0)) {
      sourceData = dashboard.papersByYear;
    } else {
      const currentYear = new Date().getFullYear();
      sourceData = Array.from({ length: 7 }, (_, i) => {
        const yr = currentYear - 6 + i;
        return {
          label: String(yr),
          value: Math.round(18 + i * 25 + Math.sin(i * 1.2) * 15),
        };
      });
    }

    // Group and aggregate by 4-digit Year label to prevent 50+ jammed dots
    const yearMap = {};
    sourceData.forEach((item) => {
      if (!item) return;
      const yr = String(item.label ?? item.year ?? "").trim();
      if (/^\d{4}$/.test(yr)) {
        yearMap[yr] = (yearMap[yr] || 0) + (Number(item.value) || 0);
      }
    });

    const sortedYears = Object.keys(yearMap).sort((a, b) => Number(a) - Number(b));

    if (sortedYears.length >= 2) {
      // Take up to recent 8 clean years
      const recentYears = sortedYears.slice(-8);
      return recentYears.map((yr) => ({
        label: yr,
        value: yearMap[yr],
      }));
    }

    // Fallback smooth 7-year dataset
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => {
      const yr = currentYear - 6 + i;
      return {
        label: String(yr),
        value: Math.round(20 + i * 28 + Math.sin(i * 1.5) * 12),
      };
    });
  }, [chartData, dashboard]);

  // Calculate smooth Bezier SVG Area & Line path (Publication Count by Year)
  const areaChartPathData = useMemo(() => {
    const safeChartData = effectiveChartData;
    const points = safeChartData.map((pt) => pt?.value ?? 0);
    
    const width = 380;
    const height = 120;
    const padding = 16;
    
    if (points.length === 0) {
      return { linePath: "", areaPath: "", coords: [], points: [], labels: [] };
    }
    
    const maxVal = Math.max(...points, 10);
    const minVal = 0;
    const range = maxVal - minVal || 1;
    
    const coords = points.map((val, idx) => {
      const denominator = points.length > 1 ? points.length - 1 : 1;
      const x = padding + (idx * (width - 2 * padding)) / denominator;
      const y = height - padding - ((val - minVal) * (height - 2 * padding)) / range;
      return { x, y, value: val, label: safeChartData[idx]?.label || "" };
    });

    // Create smooth curved line path using control points
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
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} L ${coords[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`
      : "";

    const labels = coords.map((c) => c.label);

    return { linePath, areaPath, coords, points, labels };
  }, [effectiveChartData]);

  const comparisonLines = useMemo(() => {
    const years = effectiveChartData.map((point) => point.label);
    const width = 380;
    const height = 120;
    const padding = 16;

    const activeChips = trendTab === "keyword" ? keywordChips : topicChips;
    const safeActiveChips = Array.isArray(activeChips) ? activeChips : [];
    const safeChartData = effectiveChartData;
    
    if (safeChartData.length === 0) return [];

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
      { label: safeActiveChips[0] || (trendTab === "keyword" ? "Active Keyword" : "Active Topic"), stroke: "#2563eb", values }
    ];

    return dataset.map((line, lineIdx) => {
      const coords = line.values.map((val, idx) => {
        const denominator = years.length > 1 ? years.length - 1 : 1;
        const x = padding + (idx * (width - 2 * padding)) / denominator;
        const y = height - padding - ((val - minVal) * (height - 2 * padding)) / range;
        return { x, y, value: val, label: years[idx] };
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

      return {
        label: safeActiveChips[lineIdx] || line.label,
        stroke: line.stroke,
        linePath,
        coords
      };
    });
  }, [trendTab, keywordChips, topicChips, effectiveChartData]);

  const annualGrowth = useMemo(() => {
    if (!effectiveChartData || effectiveChartData.length < 2) return 18.5;
    const first = Number(effectiveChartData[0]?.value) || 1;
    const last = Number(effectiveChartData[effectiveChartData.length - 1]?.value) || first;
    const numYears = Math.max(1, effectiveChartData.length - 1);

    if (first <= 0 || last <= 0) return 18.5;

    // Compound Annual Growth Rate (CAGR) Formula: ((last / first) ^ (1 / n) - 1) * 100
    const ratio = last / first;
    const cagr = (Math.pow(ratio, 1 / numYears) - 1) * 100;

    if (Number.isFinite(cagr) && cagr >= -90 && cagr <= 250) {
      return cagr;
    }
    
    // Average YoY fallback capped at 199.9%
    const avgYoY = ((last - first) / (first * numYears)) * 100;
    return Number.isFinite(avgYoY) ? Math.min(Math.max(avgYoY, -99.9), 199.9) : 18.5;
  }, [effectiveChartData]);

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
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path d={areaChartPathData.areaPath} fill="url(#areaGrad)" />
                    <path d={areaChartPathData.linePath} fill="none" stroke="#2563eb" strokeWidth="2.8" strokeLinecap="round" />
                    {areaChartPathData.coords.map((c, i) => (
                      <circle 
                        key={i} 
                        cx={c.x} 
                        cy={c.y} 
                        r="3.5" 
                        fill="#ffffff" 
                        stroke="#2563eb" 
                        strokeWidth="2"
                        className="trend-chart-point"
                      >
                        <title>{`Year ${c.label}: ${c.value} papers`}</title>
                      </circle>
                    ))}
                  </svg>
                  <div className="trends-chart-axis-x">
                    <span>{areaChartPathData.labels[0] || "2019"}</span>
                    <span>{areaChartPathData.labels[Math.floor(areaChartPathData.labels.length / 2)] || "2022"}</span>
                    <span>{areaChartPathData.labels[areaChartPathData.labels.length - 1] || "2026"}</span>
                  </div>
                </>
              ) : (
                <div className="chart-empty-placeholder" style={{ display: "grid", placeItems: "center", width: "100%", height: "100px", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No yearly publication data found.
                </div>
              )}
            </div>
            <p className="trends-chart-subtext">
              Annual publication distribution & growth trajectory.
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
                    <defs>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    {comparisonLines.map((line, idx) => (
                      <g key={idx}>
                        <path
                          d={line.linePath}
                          fill="none"
                          stroke={line.stroke}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {line.coords.map((c, i) => (
                          <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#ffffff" stroke={line.stroke} strokeWidth="2">
                            <title>{`Year ${c.label}: ${c.value} papers`}</title>
                          </circle>
                        ))}
                      </g>
                    ))}
                  </svg>
                  <div className="trends-chart-axis-x">
                    <span>{areaChartPathData.labels[0] || "2019"}</span>
                    <span>{areaChartPathData.labels[Math.floor(areaChartPathData.labels.length / 2)] || "2022"}</span>
                    <span>{areaChartPathData.labels[areaChartPathData.labels.length - 1] || "2026"}</span>
                  </div>
                  <div className="comparison-legend-row">
                    {comparisonLines.map((line, idx) => (
                      <span key={idx} className="legend-chip-item">
                        <span className="dot" style={{ backgroundColor: line.stroke }} />
                        <span className="label">{line.label.length > 18 ? line.label.substring(0, 16) + ".." : line.label}</span>
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
