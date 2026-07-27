import { useEffect, useMemo, useState } from "react";
import {
  FiLayers,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { getTrendingKeywords, getTrendingTopics, getTrendStats } from "../services/trendService";
import { getDashboardOverview } from "../services/dashboardService";
import { normalizeChartPoint, normalizeKeyword, normalizeTopic, toArray, formatNumber, normalizeDashboard } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import "../styles/WorkspacePages.css";
import "../styles/TrendsPage.css";

/* ── Toast Overlay ── */
function hasUsableTrendSeries(points) {
  return Array.isArray(points)
    && points.length > 0
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

const TRENDS_METADATA_CACHE_KEY = "trends_metadata_v6";
const COMPARISON_CHART_WIDTH = 680;
const COMPARISON_CHART_HEIGHT = 270;
const COMPARISON_AXIS_Y = 232;

function getTrendSeriesCacheKey(tab, term) {
  const termStr = typeof term === "string" ? term : (term?.name || term?.keyword || term?.term || String(term || ""));
  return `trend_series_${tab}_${termStr.trim().toLowerCase()}`;
}

function formatPaperCount(value) {
  if (value === null || value === undefined || value === "" || value === "—") return "—";
  if (typeof value === "number") return `${formatNumber(value)} papers`;
  const text = String(value).trim();
  if (!text) return "—";
  if (/papers?/i.test(text)) return text;
  const numericValue = Number(text.replace(/,/g, ""));
  return Number.isFinite(numericValue) ? `${formatNumber(numericValue)} papers` : text;
}

function getInitialTrendData() {
  const storedMetadata = getPersistentCachedData(TRENDS_METADATA_CACHE_KEY);
  const metadata = hasUsableMetadata(storedMetadata) ? storedMetadata : null;
  const keywords = Array.isArray(metadata?.dbKeywords) && metadata.dbKeywords.length > 0
    ? metadata.dbKeywords
    : [];
  const topics = Array.isArray(metadata?.trendingTopics) && metadata.trendingTopics.length > 0
    ? metadata.trendingTopics
    : [];

  return {
    metadata,
    keywords,
    topics,
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
  const [timeRange, setTimeRange] = useState("8y");
  
  // Data states from backend
  const [trendingTopics, setTrendingTopics] = useState(initialTrendData.topics);
  const [dbKeywords, setDbKeywords] = useState(initialTrendData.keywords);

  const [activeKeyword, setActiveKeyword] = useState(() => {
    const first = initialTrendData.keywords[0];
    return typeof first === "string" ? first : (first?.name || first?.keyword || "");
  });
  const [activeTopicState, setActiveTopicState] = useState(() => {
    const first = initialTrendData.topics[0];
    return typeof first === "string" ? first : (first?.name || first?.topic || "");
  });
  
  const [chartData, setChartData] = useState([]);
  const [dashboard, setDashboard] = useState(initialTrendData.metadata?.dashboard ?? null);
  const [metadataLoading, setMetadataLoading] = useState(!initialTrendData.metadata);
  const [chartLoading, setChartLoading] = useState(false);
  const [comparisonSeries, setComparisonSeries] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const cacheKey = TRENDS_METADATA_CACHE_KEY;
    const storedMetadata = getPersistentCachedData(cacheKey);
    const cached = hasUsableMetadata(storedMetadata) ? storedMetadata : null;

    function applyMetadata(metadata) {
      if (cancelled) return;
      const topics = Array.isArray(metadata.trendingTopics) && metadata.trendingTopics.length > 0
        ? metadata.trendingTopics
        : [];
      const keywords = Array.isArray(metadata.dbKeywords) && metadata.dbKeywords.length > 0
        ? metadata.dbKeywords
        : [];
      setTrendingTopics(topics);
      setDbKeywords(keywords);
      setDashboard(metadata.dashboard ?? null);
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
      getTrendingKeywords({ limit: 10 }).then((response) => {
        const keywords = toArray(response, ["keywords"])
          .map((kw, i) => {
            const keyword = normalizeKeyword(kw, i);
            const rawGrowth = kw?.growthRate ?? kw?.growth ?? kw?.percentage;
            const growthNumber = Number(rawGrowth);
            const growth = Number.isFinite(growthNumber)
              ? `${growthNumber >= 0 ? "+" : ""}${Math.round(growthNumber)}%`
              : (typeof rawGrowth === "string" ? rawGrowth : "");
            return {
              ...keyword,
              growth,
              totalPapers: Number(kw?.totalPapers) || keyword.paperCount,
            };
          })
          .filter((keyword) => keyword.name && keyword.name !== "Untitled keyword");
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

    Promise.allSettled(metadataRequests).finally(() => {
      if (!cancelled) setMetadataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const names = dbKeywords
      .map((keyword) => (typeof keyword === "string" ? keyword : (keyword?.name || keyword?.keyword || "")))
      .filter(Boolean);
    if (names.length === 0) return;
    setActiveKeyword((current) => current || names[0]);
  }, [dbKeywords]);

  useEffect(() => {
    const names = trendingTopics
      .map((topic) => (typeof topic === "string" ? topic : (topic?.name || topic?.topic || "")))
      .filter(Boolean);
    if (names.length === 0) return;
    setActiveTopicState((current) => current || names[0]);
  }, [trendingTopics]);

  const activeTrendTerm = trendTab === "keyword" ? activeKeyword : activeTopicState;

  const trendingKeywords = useMemo(() => {
    if (Array.isArray(dbKeywords) && dbKeywords.length > 0) {
      return dbKeywords.map((kw, idx) => {
        const name = typeof kw === "string" ? kw : (kw.name || kw.keyword || kw.term || "Keyword");
        const rawCount = typeof kw === "object" ? (kw.paperCount ?? kw.count ?? kw.paper_count ?? kw.totalPapers) : null;
        const countNum = Number(rawCount);
        
        const displayCount = Number.isFinite(countNum) && countNum > 0
          ? `${formatNumber(countNum)} papers`
          : (typeof rawCount === "string" && rawCount.trim()
              ? (rawCount.includes("paper") ? rawCount : `${rawCount} papers`)
              : "—");

        const rawGrowth = typeof kw === "object" ? (kw.growth ?? kw.growthRate ?? kw.percentage) : null;
        const growthStr = rawGrowth !== null && rawGrowth !== undefined && String(rawGrowth).trim()
          ? (String(rawGrowth).startsWith("+") || String(rawGrowth).endsWith("%")
              ? String(rawGrowth)
              : `+${rawGrowth}%`)
          : "—";

        return {
          id: kw.id ?? idx + 1,
          name,
          paperCount: displayCount,
          growth: growthStr,
        };
      });
    }
    return [];
  }, [dbKeywords]);

  const activeTrendItems = trendTab === "keyword" ? trendingKeywords : trendingTopics;
  const comparisonTermKey = useMemo(() => activeTrendItems
    .slice(0, 5)
    .map((item) => (typeof item === "string" ? item : (item?.name || item?.keyword || item?.topic || "")))
    .filter(Boolean)
    .join("\u0001"), [activeTrendItems]);

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
        if (hasUsableTrendSeries(points)) {
          setChartData(points);
          setPersistentCachedData(cacheKey, points);
        } else {
          setChartData([]);
        }
      })
      .catch(() => {
        if (!cancelled && !cached) setChartData([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTrendTerm, trendTab]);

  useEffect(() => {
    const terms = comparisonTermKey ? comparisonTermKey.split("\u0001") : [];
    if (terms.length === 0) {
      setComparisonSeries([]);
      setComparisonLoading(false);
      return;
    }

    let cancelled = false;
    const cachedSeries = terms.flatMap((term) => {
      const points = getPersistentCachedData(getTrendSeriesCacheKey(trendTab, term));
      return hasUsableTrendSeries(points) ? [{ name: term, points }] : [];
    });

    setComparisonSeries(cachedSeries);
    setComparisonLoading(cachedSeries.length < terms.length);

    Promise.allSettled(terms.map(async (term) => {
      const response = await getTrendStats(
        trendTab === "keyword" ? { keyword: term } : { topic: term },
      );
      const points = toArray(response).map(normalizeChartPoint);
      if (!hasUsableTrendSeries(points)) return null;
      setPersistentCachedData(getTrendSeriesCacheKey(trendTab, term), points);
      return { name: term, points };
    }))
      .then((results) => {
        if (cancelled) return;
        const cachedByName = new Map(cachedSeries.map((series) => [series.name, series]));
        const availableSeries = results.flatMap((result, index) => {
          if (result.status === "fulfilled" && result.value) return [result.value];
          const cachedResult = cachedByName.get(terms[index]);
          return cachedResult ? [cachedResult] : [];
        });
        setComparisonSeries(availableSeries);
      })
      .finally(() => {
        if (!cancelled) setComparisonLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [comparisonTermKey, trendTab]);

  // Aggregate only the selected API series by year. Never substitute catalog-wide or generated values.
  const effectiveChartData = useMemo(() => {
    if (!hasUsableTrendSeries(chartData)) return [];
    const yearMap = {};
    chartData.forEach((item) => {
      if (!item) return;
      const yr = String(item.label ?? item.year ?? "").trim();
      if (/^\d{4}$/.test(yr)) {
        yearMap[yr] = (yearMap[yr] || 0) + (Number(item.value) || 0);
      }
    });

    const sortedYears = Object.keys(yearMap).sort((a, b) => Number(a) - Number(b));
    const maxYears = timeRange === "3y" ? 3 : timeRange === "5y" ? 5 : 8;
    return sortedYears.slice(-maxYears).map((year) => ({
      label: year,
      value: yearMap[year],
    }));
  }, [chartData, timeRange]);

  const comparisonLines = useMemo(() => {
    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#06b6d4"];
    if (comparisonSeries.length === 0) return [];

    const maxYears = timeRange === "3y" ? 3 : timeRange === "5y" ? 5 : 8;
    const years = [...new Set(comparisonSeries.flatMap((series) =>
      series.points
        .map((point) => String(point?.label ?? "").trim())
        .filter((label) => /^\d{4}$/.test(label))
    ))]
      .sort((left, right) => Number(left) - Number(right))
      .slice(-maxYears);

    if (years.length === 0) return [];

    const width = COMPARISON_CHART_WIDTH;
    const height = 230;
    const paddingLeft = 20;
    const paddingRight = 90;
    const paddingTop = 22;
    const paddingBottom = 25;
    const valuesBySeries = comparisonSeries.map((series) => {
      const yearlyValues = new Map();
      series.points.forEach((point) => {
        const year = String(point?.label ?? "").trim();
        if (!/^\d{4}$/.test(year)) return;
        yearlyValues.set(year, (yearlyValues.get(year) || 0) + (Number(point?.value) || 0));
      });
      return years.map((year) => yearlyValues.get(year) || 0);
    });
    const maxVal = Math.max(1, ...valuesBySeries.flat());

    const rawLines = comparisonSeries.map((series, seriesIndex) => {
      const numPoints = years.length;
      const values = valuesBySeries[seriesIndex];
      const coords = values.map((value, index) => {
        const x = numPoints === 1
          ? (paddingLeft + width - paddingRight) / 2
          : paddingLeft + (index * (width - paddingLeft - paddingRight)) / (numPoints - 1);
        const y = height - paddingBottom
          - (value / maxVal) * (height - paddingTop - paddingBottom);
        return { x, y, value, label: years[index] };
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

      const finalCoord = coords[coords.length - 1];

      return {
        label: series.name,
        color: colors[seriesIndex % colors.length],
        linePath,
        coords,
        finalValStr: formatNumber(finalCoord?.value ?? 0),
        finalCoord,
        rawY: finalCoord ? finalCoord.y : 0,
      };
    });

    const labelGap = 19;
    const minLabelY = paddingTop + 4;
    const maxLabelY = height - paddingBottom + 4;
    const sortedLines = rawLines
      .map((line, index) => ({ ...line, originalIndex: index }))
      .sort((a, b) => a.rawY - b.rawY);
    const labelPositions = sortedLines.map((line) =>
      Math.min(maxLabelY, Math.max(minLabelY, line.rawY + 4))
    );

    for (let index = 1; index < labelPositions.length; index += 1) {
      labelPositions[index] = Math.max(
        labelPositions[index],
        labelPositions[index - 1] + labelGap
      );
    }

    if (labelPositions.at(-1) > maxLabelY) {
      labelPositions[labelPositions.length - 1] = maxLabelY;
      for (let index = labelPositions.length - 2; index >= 0; index -= 1) {
        labelPositions[index] = Math.min(
          labelPositions[index],
          labelPositions[index + 1] - labelGap
        );
      }
    }

    const resolvedLabelY = new Map(
      sortedLines.map((line, index) => [line.originalIndex, labelPositions[index]])
    );

    return rawLines.map((line, index) => ({
      ...line,
      labelY: resolvedLabelY.get(index) ?? line.rawY + 4,
    }));
  }, [comparisonSeries, timeRange]);

  const annualGrowth = useMemo(() => {
    if (!effectiveChartData || effectiveChartData.length < 2) return null;
    const first = Number(effectiveChartData[0]?.value);
    const last = Number(effectiveChartData[effectiveChartData.length - 1]?.value);
    const numYears = Math.max(1, effectiveChartData.length - 1);

    if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0 || last <= 0) {
      return null;
    }

    // Compound Annual Growth Rate (CAGR) Formula: ((last / first) ^ (1 / n) - 1) * 100
    const ratio = last / first;
    const cagr = (Math.pow(ratio, 1 / numYears) - 1) * 100;
    return Number.isFinite(cagr) ? cagr : null;
  }, [effectiveChartData]);

  return (
    <MainLayout title="Trends & Topics" subtitle="Discover emerging research trends and topic evolution">
      <div className="trends-page-container">
        {(metadataLoading || chartLoading || comparisonLoading) && (
          <div className="trends-loading-notice" role="status" aria-live="polite">
            <span className="workspace-loading-spinner" />
            <span>
              {metadataLoading
                ? "Loading trend catalog…"
                : comparisonLoading
                  ? `Loading real ${trendTab} comparison data…`
                  : `Updating ${trendTab} chart…`}
            </span>
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
            <div className="trends-select-wrapper-custom">
              <FiCalendar style={{ left: "12px", right: "auto", position: "absolute", color: "var(--st-primary)" }} />
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)} 
                style={{ paddingLeft: "34px", paddingRight: "30px", fontWeight: 700, color: "var(--st-heading)" }} 
                aria-label="Select trend time horizon"
              >
                <option value="8y">Range: Recent 8 Years</option>
                <option value="5y">Range: Recent 5 Years</option>
                <option value="3y">Range: Recent 3 Years</option>
              </select>
              <FiChevronDown />
            </div>

            <div className="trends-status-badge">
              <span className="live-dot" />
              <span>Live Analytics Engine</span>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards row */}
        <div className="trends-stats-cards-row">
          <div className="trend-stat-card card-accent-blue">
            <span className="stat-card-label">Total Publications</span>
            <h3 className="stat-card-value">
              {dashboard ? formatNumber(dashboard.totalPapers) : "—"}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">Live catalog total</span>
            </span>
          </div>
          <div className="trend-stat-card card-accent-emerald">
            <span className="stat-card-label">Avg. Annual Growth</span>
            <h3 className="stat-card-value">
              {annualGrowth === null ? "—" : `${annualGrowth >= 0 ? "+" : ""}${annualGrowth.toFixed(1)}%`}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">Across the selected series</span>
            </span>
          </div>
          <div className="trend-stat-card card-accent-purple">
            <span className="stat-card-label">{trendTab === "keyword" ? "Emerging Keywords" : "Emerging Topics"}</span>
            <h3 className="stat-card-value">
              {trendTab === "keyword"
                ? (dashboard?.totalKeywords > 0 ? formatNumber(dashboard.totalKeywords) : (dbKeywords.length || "—"))
                : (trendingTopics.length || "—")}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">{trendTab === "keyword" ? "Indexed keywords" : "Indexed topics"}</span>
            </span>
          </div>
          <div className="trend-stat-card card-accent-rose">
            <span className="stat-card-label">{trendTab === "keyword" ? "Breakout Keywords" : "Breakout Topics"}</span>
            <h3 className="stat-card-value">
              {trendTab === "keyword" ? Math.min(dbKeywords.length, 10) : trendingTopics.length}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">{trendTab === "keyword" ? "Returned by keywords API" : "Returned by trends API"}</span>
            </span>
          </div>
        </div>

        {/* Middle row: Multi-line comparison chart and top trending table */}
        <div className="trends-middle-grid">

          {/* Card 2: Keyword/Topic Comparison */}
          <article className="trends-chart-panel glassmorphic-panel multi-line-comp-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "Keyword Comparison" : "Topic Comparison"}</h3>
              <span className="badge-chip badge-cyan">Papers / year</span>
            </div>

            {comparisonLines.length > 0 ? (
              <>
                <div className="multi-line-legend-container">
                  {comparisonLines.map((line) => (
                    <div key={line.label} className="multi-line-legend-item">
                      <span className="legend-dot-pill" style={{ backgroundColor: line.color }} />
                      <span className="legend-text">{line.label}</span>
                    </div>
                  ))}
                </div>

                <div className="trends-svg-chart-container">
                  <svg
                    viewBox={`0 0 ${COMPARISON_CHART_WIDTH} ${COMPARISON_CHART_HEIGHT}`}
                    className="trends-svg-chart multi-line-svg"
                  >
                    {comparisonLines.map((line) => (
                      <g key={line.label} className="multi-line-group">
                        <path
                          d={line.linePath}
                          fill="none"
                          stroke={line.color}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        {line.coords.map((point) => (
                          <circle
                            key={point.label}
                            cx={point.x}
                            cy={point.y}
                            r="4.5"
                            fill="#ffffff"
                            stroke={line.color}
                            strokeWidth="2.8"
                            className="trend-chart-point"
                          >
                            <title>{`${line.label} (${point.label}): ${formatNumber(point.value)} papers`}</title>
                          </circle>
                        ))}
                        {line.finalCoord && (
                          <>
                            <line
                              x1={line.finalCoord.x + 6}
                              y1={line.finalCoord.y}
                              x2={line.finalCoord.x + 13}
                              y2={line.labelY || line.finalCoord.y}
                              stroke={line.color}
                              className="multi-line-label-connector"
                            />
                            <text
                              x={line.finalCoord.x + 17}
                              y={line.labelY || line.finalCoord.y}
                              fill={line.color}
                              fontSize="12.5"
                              fontWeight="850"
                              dominantBaseline="middle"
                              className="multi-line-end-label"
                            >
                              {line.finalValStr}
                              <title>{`${line.finalValStr} papers in ${line.finalCoord.label}`}</title>
                            </text>
                          </>
                        )}
                      </g>
                    ))}
                    <g className="trend-chart-axis" aria-hidden="true">
                      <line
                        x1={comparisonLines[0]?.coords[0]?.x}
                        y1={COMPARISON_AXIS_Y}
                        x2={comparisonLines[0]?.coords[comparisonLines[0].coords.length - 1]?.x}
                        y2={COMPARISON_AXIS_Y}
                        className="trend-chart-axis-line"
                      />
                    {comparisonLines[0]?.coords.map((point) => (
                      <text
                        key={point.label}
                        x={point.x}
                        y={COMPARISON_AXIS_Y + 24}
                        textAnchor="middle"
                        className="trend-chart-axis-label"
                      >
                        {point.label}
                      </text>
                    ))}
                    </g>
                  </svg>
                </div>
              </>
            ) : (
              <div className="trend-comparison-empty" role="status">
                {comparisonLoading
                  ? "Loading publication history from the backend…"
                  : `No yearly publication data is available for these ${trendTab}s.`}
              </div>
            )}
          </article>

          {/* Card 3: Top Trending Topics list */}
          <article className="trends-table-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "Top Trending Keywords" : "Top Trending Topics"}</h3>
              <span className="badge-chip badge-amber">Top 5</span>
            </div>
            <div className="trends-compact-table-wrap">
              <table className="trends-compact-table">
                <thead>
                  <tr>
                    <th style={{ width: "62%" }}>{trendTab === "keyword" ? "Keyword" : "Topic"}</th>
                    <th style={{ width: "38%", textAlign: "right" }}>Publications</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrendItems.slice(0, 5).map((item, idx) => (
                    <tr key={item.id ?? idx}>
                      <td>
                        <div className="trends-topic-cell">
                          <span className={`rank-num rank-num-${idx % 5}`}>{idx + 1}</span>
                          <span className="topic-name" title={item.name}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="pub-count-pill">
                          {formatPaperCount(item.paperCount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {activeTrendItems.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ textAlign: "center", padding: "30px 0", color: "var(--st-muted-strong)", fontSize: "13px" }}>
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
              <span className="badge-chip badge-emerald">Growth</span>
            </div>
            <div className="trends-sparkline-list">
              {activeTrendItems.slice(0, 3).map((item, idx) => (
                <div key={item.id ?? idx} className={`trends-sparkline-row row-color-${idx % 3}`}>
                  <div className="topic-rank-name">
                    <span className={`bullet-dot ${idx === 0 ? "bullet-emerald" : idx === 1 ? "bullet-purple" : "bullet-rose"}`} />
                    <span className="name">{item.name}</span>
                  </div>
                  <div className="sparkline-stats">
                    <span className={`growth-pill-${idx === 0 ? "vivid" : idx === 1 ? "purple" : "rose"}`}>{item.growth || "—"}</span>
                  </div>
                </div>
              ))}
              {activeTrendItems.length === 0 && (
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
              <span className="badge-chip badge-blue">Activity</span>
            </div>
            <div className="trends-sparkline-list">
              {activeTrendItems.slice(3, 6).map((item, idx) => (
                <div key={item.id ?? idx} className={`trends-sparkline-row row-active-${idx % 3}`}>
                  <div className="topic-rank-name">
                    <span className={`bullet-dot ${idx === 0 ? "bullet-blue" : idx === 1 ? "bullet-cyan" : "bullet-amber"}`} />
                    <span className="name">{item.name}</span>
                  </div>
                  <div className="sparkline-stats">
                    <span className={`activity-pill-${idx === 0 ? "blue" : idx === 1 ? "cyan" : "amber"}`}>{item.paperCount || "—"}</span>
                  </div>
                </div>
              ))}
              {activeTrendItems.length === 0 && (
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
              <span className="badge-chip badge-rose">Insights</span>
            </div>
            <div className="trends-insights-scroll-list">
              {activeTrendItems.length > 0 ? (
                activeTrendItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={`insight-card-item ${idx === 0 ? "insight-amber" : idx === 1 ? "insight-purple" : "insight-emerald"}`}>
                    <div className={`insight-icon-circle ${idx === 0 ? "amber" : idx === 1 ? "purple" : "emerald"}`}>
                      <FiLayers />
                    </div>
                    <p>
                      <strong>{item.name}</strong> has {item.paperCount || "no paper count"}; reported growth is {item.growth || "not available"}.
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
