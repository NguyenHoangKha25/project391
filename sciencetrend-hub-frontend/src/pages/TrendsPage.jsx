import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiCheck,
  FiLayers,
  FiCalendar,
  FiChevronDown,
  FiSearch,
  FiPlus,
  FiX,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import {
  compareTrends,
  getKeywordSuggestions,
  getTopicSuggestions,
  getTrendingKeywords,
  getTrendingTopics,
  getTrendStats,
} from "../services/trendService";
import { getDashboardOverview } from "../services/dashboardService";
import { normalizeChartPoint, normalizeKeyword, normalizeTopic, toArray, formatNumber, normalizeDashboard } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import "../styles/WorkspacePages.css";
import "../styles/TrendsPage.css";

function TrendsSuggestionPortal({ anchorRef, children, id, isOpen }) {
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setPosition({
        position: "fixed",
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxHeight: `${Math.max(140, Math.min(280, window.innerHeight - rect.bottom - 18))}px`,
        zIndex: 2147483647,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, isOpen, children]);

  if (!isOpen || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="trends-autocomplete-menu-portal"
      id={id}
      role="listbox"
      style={position}
    >
      {children}
    </div>,
    document.body,
  );
}

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

const TRENDS_METADATA_CACHE_PREFIX = "trends_metadata_v9";
const ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;
const COMPARISON_CHART_WIDTH = 760;
const COMPARISON_CHART_HEIGHT = 300;
const COMPARISON_PLOT_HEIGHT = 250;
const COMPARISON_PLOT_LEFT = 48;
const COMPARISON_PLOT_RIGHT = 24;
const COMPARISON_PLOT_TOP = 22;
const COMPARISON_PLOT_BOTTOM = 25;
const COMPARISON_GRID_LEVELS = [1, 0.75, 0.5, 0.25, 0];
const CURRENT_YEAR = new Date().getFullYear();

function getRangeStartYear(timeRange) {
  const rangeYears = timeRange === "3y" ? 3 : timeRange === "5y" ? 5 : 8;
  return CURRENT_YEAR - rangeYears + 1;
}

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

function parseMetricNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatGrowthPercentage(rawGrowth) {
  if (rawGrowth === null || rawGrowth === undefined || String(rawGrowth).trim() === "") return "";
  if (typeof rawGrowth === "string" && rawGrowth.trim().endsWith("%")) return rawGrowth.trim();
  const numericGrowth = Number(rawGrowth);
  if (!Number.isFinite(numericGrowth)) return "";
  const percentage = numericGrowth !== 0 && Math.abs(numericGrowth) < 1
    ? numericGrowth * 100
    : numericGrowth;
  const rounded = Math.round(percentage * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function createSmoothLinePath(points = []) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlOffset = (point.x - previous.x) * 0.42;
    return `${path} C ${(previous.x + controlOffset).toFixed(1)},${previous.y.toFixed(1)} ${(point.x - controlOffset).toFixed(1)},${point.y.toFixed(1)} ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }, `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`);
}

function normalizeTrendKeywords(response) {
  return toArray(response, ["keywords"])
    .map((item, index) => {
      const keyword = normalizeKeyword(item, index);
      const rawGrowth = item?.growthRate ?? item?.growth ?? item?.percentage;
      const growth = formatGrowthPercentage(rawGrowth);
      return {
        ...keyword,
        growth,
        totalPapers: Number(item?.totalPapers) || keyword.paperCount,
      };
    })
    .filter((keyword) => keyword.name && keyword.name !== "Untitled keyword");
}

function normalizeTrendTopics(response) {
  return toArray(response)
    .map(normalizeTopic)
    .filter((topic) => topic.name && topic.name !== "Untitled topic");
}

function normalizeTrendComparison(response) {
  const payload = response?.data ?? response ?? {};
  return {
    type: String(payload.type || "").toUpperCase(),
    fromYear: Number(payload.fromYear) || null,
    toYear: Number(payload.toYear) || null,
    series: Array.isArray(payload.series)
      ? payload.series.map((item) => ({
          name: String(item?.name || "").trim(),
          totalPapers: Number(item?.totalPapers) || 0,
          growthRate: Number(item?.growthRate) || 0,
          points: toArray(item?.yearlyData).map(normalizeChartPoint),
        })).filter((item) => item.name && hasUsableTrendSeries(item.points))
      : [],
  };
}

function getDashboardKeywordFallback(dashboard) {
  if (!Array.isArray(dashboard?.topKeywords)) return [];
  return dashboard.topKeywords
    .filter((item) => item?.label && Number(item?.value) > 0)
    .map((item, index) => ({
      id: `dashboard-keyword-${index + 1}`,
      name: item.label,
      paperCount: Number(item.value) || 0,
      totalPapers: Number(item.value) || 0,
      growth: "",
    }));
}

function mergeTrendItemsByName(primary = [], fallback = []) {
  const seen = new Set();
  return [...primary, ...fallback].filter((item) => {
    const name = String(item?.name || item?.keyword || item?.topic || item || "").trim().toLocaleLowerCase();
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function normalizeAutocompleteSuggestions(response, type) {
  const seen = new Set();
  return toArray(response, ["suggestions", type === "keyword" ? "keywords" : "topics"])
    .map((item) => {
      const value = type === "keyword"
        ? String(item?.term ?? "").trim()
        : String(item?.name ?? "").trim();
      return {
        value,
        paperCount: Number(item?.paperCount ?? item?.count ?? item?.totalPapers) || 0,
      };
    })
    .filter((item) => {
      const key = item.value.toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function getTrendsMetadataCacheKey(role, timeRange = "8y") {
  return `${TRENDS_METADATA_CACHE_PREFIX}_${String(role || "STUDENT").toUpperCase()}_${timeRange}`;
}

function getInitialTrendData(role, timeRange = "8y") {
  const storedMetadata = getPersistentCachedData(
    getTrendsMetadataCacheKey(role, timeRange),
    ANALYTICS_CACHE_TTL_MS,
  );
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
  const { role, user } = useAuth();
  const normalizedRole = String(role || user?.role || "STUDENT").toUpperCase();
  const isStudent = normalizedRole === "STUDENT";
  const isLecturer = normalizedRole === "LECTURER";
  const canCompare = ["RESEARCHER", "ADMIN"].includes(normalizedRole);
  const canViewTopTrending = !isStudent;
  const [initialTrendData] = useState(() => getInitialTrendData(normalizedRole, "8y"));

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
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestionAnchorRef = useRef(null);
  
  const [chartData, setChartData] = useState([]);
  const [dashboard, setDashboard] = useState(initialTrendData.metadata?.dashboard ?? null);
  const [metadataLoading, setMetadataLoading] = useState(!initialTrendData.metadata);
  const [chartLoading, setChartLoading] = useState(false);
  const [comparisonSeries, setComparisonSeries] = useState([]);
  const [comparisonSelections, setComparisonSelections] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [focusedSeries, setFocusedSeries] = useState("");
  const [metadataSource, setMetadataSource] = useState(
    initialTrendData.metadata?.sources ?? { keyword: "trend", topic: "trend" },
  );
  const { toast, showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const fromYear = getRangeStartYear(timeRange);
    const cacheKey = getTrendsMetadataCacheKey(normalizedRole, timeRange);
    const storedMetadata = getPersistentCachedData(cacheKey, ANALYTICS_CACHE_TTL_MS);
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
      setMetadataSource(metadata.sources ?? { keyword: "trend", topic: "trend" });
    }

    if (cached) {
      applyMetadata(cached);
      setMetadataLoading(false);
    }

    async function loadMetadata() {
      const [topicTrendResult, keywordTrendResult, dashboardResult] = await Promise.allSettled([
        canViewTopTrending ? getTrendingTopics({ limit: 10, fromYear }) : Promise.resolve(null),
        canViewTopTrending ? getTrendingKeywords({ limit: 10, fromYear }) : Promise.resolve(null),
        canViewTopTrending ? getDashboardOverview() : Promise.resolve(null),
      ]);

      if (cancelled) return;

      const liveTopics = topicTrendResult.status === "fulfilled"
        ? normalizeTrendTopics(topicTrendResult.value)
        : [];
      const liveKeywords = keywordTrendResult.status === "fulfilled"
        ? normalizeTrendKeywords(keywordTrendResult.value)
        : [];
      const nextDashboard = dashboardResult.status === "fulfilled"
        ? normalizeDashboard(dashboardResult.value?.data ?? dashboardResult.value)
        : null;
      const dashboardKeywords = getDashboardKeywordFallback(nextDashboard);
      const nextKeywords = mergeTrendItemsByName(liveKeywords, dashboardKeywords).slice(0, 10);
      const nextTopics = liveTopics.slice(0, 10);
      const nextMetadata = {
        dbKeywords: nextKeywords.length > 0 ? nextKeywords : (cached?.dbKeywords ?? []),
        trendingTopics: nextTopics.length > 0 ? nextTopics : (cached?.trendingTopics ?? []),
        dashboard: hasUsableDashboard(nextDashboard) ? nextDashboard : (cached?.dashboard ?? null),
        sources: {
          keyword: liveKeywords.length > 0 ? "trend" : "dashboard",
          topic: "trend",
        },
      };

      if (hasUsableMetadata(nextMetadata)) {
        setPersistentCachedData(cacheKey, nextMetadata);
      }
      applyMetadata(nextMetadata);
    }

    loadMetadata().finally(() => {
      if (!cancelled) setMetadataLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canViewTopTrending, normalizedRole, timeRange]);

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

  const trendItems = trendTab === "keyword" ? trendingKeywords : trendingTopics;
  const derivedGrowthByName = useMemo(() => {
    const allYears = [...new Set(comparisonSeries.flatMap((series) => (
      series.points
        .map((point) => String(point?.label ?? "").trim())
        .filter((label) => /^\d{4}$/.test(label))
    )))].sort((left, right) => Number(left) - Number(right));
    const latestYear = allYears.at(-1);
    if (!latestYear) return new Map();

    return new Map(comparisonSeries.flatMap((series) => {
      const yearlyValues = new Map();
      series.points.forEach((point) => {
        const year = String(point?.label ?? "").trim();
        if (!/^\d{4}$/.test(year)) return;
        yearlyValues.set(year, (yearlyValues.get(year) || 0) + (Number(point?.value) || 0));
      });
      const firstActiveYear = allYears.find((year) => (yearlyValues.get(year) || 0) > 0);
      if (!firstActiveYear || firstActiveYear === latestYear) return [];
      const firstValue = yearlyValues.get(firstActiveYear) || 0;
      const latestValue = yearlyValues.get(latestYear) || 0;
      if (firstValue <= 0) return [];
      const growth = ((latestValue - firstValue) / firstValue) * 100;
      return [[String(series.name || "").trim().toLowerCase(), formatGrowthPercentage(growth)]];
    }));
  }, [comparisonSeries]);
  const activeTrendItems = useMemo(() => trendItems.map((item) => {
    if (parseMetricNumber(item?.growth) !== null) return item;
    const derivedGrowth = derivedGrowthByName.get(String(item?.name || "").trim().toLowerCase());
    return derivedGrowth ? { ...item, growth: derivedGrowth, growthDerived: true } : item;
  }), [derivedGrowthByName, trendItems]);
  const topGrowingItems = useMemo(() => activeTrendItems
    .map((item) => ({ item, value: parseMetricNumber(item?.growth) }))
    .filter((entry) => entry.value !== null)
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
    .map((entry) => entry.item), [activeTrendItems]);
  const mostActiveItems = useMemo(() => activeTrendItems
    .map((item) => ({ item, value: parseMetricNumber(item?.paperCount) }))
    .filter((entry) => entry.value !== null)
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
    .map((entry) => entry.item), [activeTrendItems]);
  const availableComparisonNames = useMemo(() => trendItems
    .map((item) => (typeof item === "string" ? item : (item?.name || item?.keyword || item?.topic || "")))
    .filter(Boolean), [trendItems]);

  useEffect(() => {
    if (!canCompare && activeTrendTerm && !suggestionsOpen) setSuggestionQuery(activeTrendTerm);
  }, [activeTrendTerm, canCompare, suggestionsOpen]);

  useEffect(() => {
    const query = suggestionQuery.trim();
    if (!suggestionsOpen || query.length < 2) {
      setAutocompleteSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSuggestionsLoading(true);
      const request = trendTab === "keyword"
        ? getKeywordSuggestions(query, 0, 10)
        : getTopicSuggestions(query, 0, 10);
      request
        .then((response) => {
          if (!cancelled) {
            setAutocompleteSuggestions(normalizeAutocompleteSuggestions(response, trendTab));
          }
        })
        .catch(() => {
          if (!cancelled) setAutocompleteSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSuggestionsLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [suggestionQuery, suggestionsOpen, trendTab]);

  const comparisonTermKey = useMemo(() => (
    canCompare ? comparisonSelections : [activeTrendTerm].filter(Boolean)
  ).join("\u0001"), [activeTrendTerm, canCompare, comparisonSelections]);
  const singleTrendTerm = canCompare
    ? (comparisonSelections.length === 1 ? comparisonSelections[0] : "")
    : activeTrendTerm;
  const isMultiSeriesComparison = canCompare && comparisonSelections.length >= 2;

  function addComparisonTerm(term) {
    if (!term || comparisonSelections.includes(term)) return;
    if (comparisonSelections.length >= 5) {
      showToast("Compare Trends supports up to 5 items.", "warning");
      return;
    }
    setComparisonSelections((current) => [...current, term]);
  }

  function removeComparisonTerm(term) {
    setComparisonSelections((current) => current.filter((item) => item !== term));
  }

  function selectAutocompleteSuggestion(value) {
    if (canCompare) {
      addComparisonTerm(value);
      setSuggestionQuery("");
    } else {
      setSuggestionQuery(value);
      if (trendTab === "keyword") setActiveKeyword(value);
      else setActiveTopicState(value);
    }
    setAutocompleteSuggestions([]);
    setSuggestionsOpen(false);
  }

  function changeTrendTab(nextTab) {
    setTrendTab(nextTab);
    setComparisonSelections([]);
    setSuggestionQuery("");
    setAutocompleteSuggestions([]);
    setSuggestionsOpen(false);
  }

  useEffect(() => {
    setFocusedSeries("");
  }, [comparisonTermKey, trendTab]);

  useEffect(() => {
    if (!singleTrendTerm) {
      setChartData([]);
      setChartLoading(false);
      return;
    }

    let cancelled = false;
    const cacheKey = getTrendSeriesCacheKey(trendTab, singleTrendTerm);
    const storedSeries = getPersistentCachedData(cacheKey, ANALYTICS_CACHE_TTL_MS);
    const cached = hasUsableTrendSeries(storedSeries) ? storedSeries : null;

    if (cached) {
      setChartData(cached);
      setChartLoading(false);
    } else {
      setChartData([]);
      setChartLoading(true);
    }

    getTrendStats(trendTab === "keyword" ? { keyword: singleTrendTerm } : { topic: singleTrendTerm })
      .then((response) => {
        if (cancelled) return;
        const points = toArray(response).map(normalizeChartPoint);
        if (hasUsableTrendSeries(points)) {
          setChartData(points);
          setPersistentCachedData(cacheKey, points);
        } else if (!cached) {
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
  }, [singleTrendTerm, trendTab]);

  useEffect(() => {
    const terms = comparisonTermKey ? comparisonTermKey.split("\u0001") : [];
    if (!canCompare || terms.length < 2) {
      setComparisonSeries([]);
      setComparisonLoading(false);
      return;
    }

    let cancelled = false;
    const cachedSeries = terms.flatMap((term) => {
      const points = getPersistentCachedData(
        getTrendSeriesCacheKey(trendTab, term),
        ANALYTICS_CACHE_TTL_MS,
      );
      return hasUsableTrendSeries(points) ? [{ name: term, points }] : [];
    });

    setComparisonSeries(cachedSeries);
    setComparisonLoading(cachedSeries.length < terms.length);

    async function fetchIndividualSeries() {
      const results = await Promise.allSettled(terms.map(async (term) => {
        const response = await getTrendStats(
          trendTab === "keyword" ? { keyword: term } : { topic: term },
        );
        const points = toArray(response).map(normalizeChartPoint);
        if (!hasUsableTrendSeries(points)) return null;
        setPersistentCachedData(getTrendSeriesCacheKey(trendTab, term), points);
        return { name: term, points };
      }));
      const cachedByName = new Map(cachedSeries.map((series) => [series.name, series]));
      return results.flatMap((result, index) => {
        if (result.status === "fulfilled" && result.value) return [result.value];
        const cachedResult = cachedByName.get(terms[index]);
        return cachedResult ? [cachedResult] : [];
      });
    }

    async function loadComparison() {
      let availableSeries;
      if (terms.length >= 2) {
        const fromYear = getRangeStartYear(timeRange);
        try {
          const response = await compareTrends({
            type: trendTab,
            items: terms,
            fromYear,
            toYear: CURRENT_YEAR,
          });
          const comparison = normalizeTrendComparison(response);
          availableSeries = comparison.series;
          availableSeries.forEach((series) => {
            setPersistentCachedData(getTrendSeriesCacheKey(trendTab, series.name), series.points);
          });
        } catch {
          availableSeries = await fetchIndividualSeries();
        }
      } else {
        availableSeries = await fetchIndividualSeries();
      }

      if (!cancelled) setComparisonSeries(availableSeries);
    }

    loadComparison().finally(() => {
      if (!cancelled) setComparisonLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canCompare, comparisonTermKey, timeRange, trendTab]);

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

    const fromYear = getRangeStartYear(timeRange);
    const sortedYears = Object.keys(yearMap)
      .filter((year) => Number(year) >= fromYear && Number(year) <= CURRENT_YEAR)
      .sort((a, b) => Number(a) - Number(b));
    return sortedYears.map((year) => ({
      label: year,
      value: yearMap[year],
    }));
  }, [chartData, timeRange]);

  const visualSeries = useMemo(() => {
    if (isMultiSeriesComparison) return comparisonSeries;
    if (!singleTrendTerm || !hasUsableTrendSeries(chartData)) return [];
    return [{ name: singleTrendTerm, points: chartData }];
  }, [chartData, comparisonSeries, isMultiSeriesComparison, singleTrendTerm]);

  const comparisonLines = useMemo(() => {
    const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#06b6d4"];
    if (visualSeries.length === 0) return [];

    const fromYear = getRangeStartYear(timeRange);
    const years = [...new Set(visualSeries.flatMap((series) =>
      series.points
        .map((point) => String(point?.label ?? "").trim())
        .filter((label) => /^\d{4}$/.test(label)
          && Number(label) >= fromYear
          && Number(label) <= CURRENT_YEAR)
    ))]
      .sort((left, right) => Number(left) - Number(right));

    if (years.length === 0) return [];

    const width = COMPARISON_CHART_WIDTH;
    const height = COMPARISON_PLOT_HEIGHT;
    const paddingLeft = COMPARISON_PLOT_LEFT;
    const paddingRight = COMPARISON_PLOT_RIGHT;
    const paddingTop = COMPARISON_PLOT_TOP;
    const paddingBottom = COMPARISON_PLOT_BOTTOM;
    const valuesBySeries = visualSeries.map((series) => {
      const yearlyValues = new Map();
      series.points.forEach((point) => {
        const year = String(point?.label ?? "").trim();
        if (!/^\d{4}$/.test(year)) return;
        yearlyValues.set(year, (yearlyValues.get(year) || 0) + (Number(point?.value) || 0));
      });
      return years.map((year) => yearlyValues.get(year) || 0);
    });
    const maxVal = Math.max(1, ...valuesBySeries.flat());
    const axisMax = Math.max(2, maxVal);
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const plotBaseY = height - paddingBottom;

    return visualSeries.map((series, seriesIndex) => {
      const values = valuesBySeries[seriesIndex];
      const coords = values.map((value, index) => {
        const x = years.length === 1
          ? paddingLeft + plotWidth / 2
          : paddingLeft + (plotWidth * index) / (years.length - 1);
        const y = plotBaseY - (value / axisMax) * plotHeight;
        return {
          x,
          y,
          value,
          label: years[index],
        };
      });
      const finalPoint = coords[coords.length - 1];
      const linePath = createSmoothLinePath(coords);
      const areaPath = coords.length > 1
        ? `${linePath} L ${coords.at(-1).x.toFixed(1)},${plotBaseY.toFixed(1)} L ${coords[0].x.toFixed(1)},${plotBaseY.toFixed(1)} Z`
        : "";

      return {
        label: series.name,
        color: colors[seriesIndex % colors.length],
        strokeGradientId: `trend-line-gradient-${seriesIndex + 1}`,
        areaGradientId: `trend-area-gradient-${seriesIndex + 1}`,
        coords,
        linePath,
        areaPath,
        finalValStr: formatNumber(finalPoint?.value ?? 0),
        finalYear: finalPoint?.label ?? "",
        totalValStr: formatNumber(values.reduce((sum, value) => sum + value, 0)),
        axisMax,
        years,
      };
    });
  }, [timeRange, visualSeries]);

  const activeFocusedSeries = useMemo(() => {
    if (focusedSeries === "ALL") return "ALL";
    if (focusedSeries && comparisonLines.some((line) => line.label === focusedSeries)) {
      return focusedSeries;
    }
    return comparisonLines[0]?.label || "";
  }, [focusedSeries, comparisonLines]);

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
          <div className="trends-loading-notice page-loading-inline" role="status" aria-live="polite">
            <span className="workspace-loading-spinner" />
            <span>Loading data…</span>
          </div>
        )}
        {toast && <div className={`papers-toast papers-toast--${toast.type}`}>{toast.message}</div>}
        
        {/* Sub-toolbar for filters, search, and switch tab buttons */}
        <div className="trends-controls-bar">
          <div className="trends-tab-buttons-group">
            <button
              type="button"
              className={`trends-btn-toggle ${trendTab === "keyword" ? "active" : ""}`}
              onClick={() => changeTrendTab("keyword")}
            >
              Keyword Trend
            </button>
            <button
              type="button"
              className={`trends-btn-toggle ${trendTab === "topic" ? "active" : ""}`}
              onClick={() => changeTrendTab("topic")}
            >
              Topic Trend
            </button>
          </div>

          <div className="trends-filter-inputs-group">
            {!canCompare && (
              <div
                className="trends-autocomplete trends-single-select"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)
                    && !event.relatedTarget?.closest?.(".trends-autocomplete-menu-portal")) setSuggestionsOpen(false);
                }}
              >
                <div ref={suggestionAnchorRef} className="trends-search-box-wrap">
                  <FiSearch />
                  <input
                    type="text"
                    value={suggestionQuery}
                    onChange={(event) => {
                      setSuggestionQuery(event.target.value);
                      setSuggestionsOpen(true);
                    }}
                    onFocus={() => setSuggestionsOpen(suggestionQuery.trim().length >= 2)}
                    placeholder={`Search and select a ${trendTab}…`}
                    aria-label={`Search and select one ${trendTab}`}
                    aria-expanded={suggestionsOpen}
                    aria-controls="trend-single-suggestions"
                  />
                </div>
                {suggestionsOpen && suggestionQuery.trim().length >= 2 && (
                  <TrendsSuggestionPortal anchorRef={suggestionAnchorRef} id="trend-single-suggestions" isOpen={suggestionsOpen}>
                    {suggestionsLoading ? (
                      <span className="trends-autocomplete-state">Finding matches…</span>
                    ) : autocompleteSuggestions.length > 0 ? (
                      autocompleteSuggestions.map((suggestion) => (
                        <button
                          type="button"
                          role="option"
                          key={suggestion.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAutocompleteSuggestion(suggestion.value);
                          }}
                          onClick={() => selectAutocompleteSuggestion(suggestion.value)}
                        >
                          <span>{suggestion.value}</span>
                          {suggestion.paperCount > 0 && <small>{formatNumber(suggestion.paperCount)} papers</small>}
                        </button>
                      ))
                    ) : (
                      <span className="trends-autocomplete-state">No matching {trendTab}s found.</span>
                    )}
                  </TrendsSuggestionPortal>
                )}
              </div>
            )}
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

            <div
              className="trends-status-badge"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#047857",
                padding: "0 14px",
                height: "36px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "10px",
              }}
            >
              <span className="live-dot" />
              <span
                style={{
                  color: "#047857",
                  WebkitTextFillColor: "#047857",
                  fontWeight: "800",
                  fontSize: "12.5px",
                }}
              >
                {metadataSource[trendTab] === "trend" ? "Live Trend Analytics" : "Catalog Analytics"}
              </span>
            </div>
          </div>
        </div>

        {/* Summary analytics are available from Lecturer upward. */}
        {canViewTopTrending && (
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
            <span className="stat-card-label">{trendTab === "keyword" ? "Indexed Keywords" : "Trending Topics"}</span>
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
            <span className="stat-card-label">{trendTab === "keyword" ? "Available Keywords" : "Available Topics"}</span>
            <h3 className="stat-card-value">
              {activeTrendItems.length || "—"}
            </h3>
            <span className="stat-card-trend-text positive">
              <span className="sub">{canCompare ? "Available for trend comparison" : "Available for single trend analysis"}</span>
            </span>
          </div>
        </div>
        )}

        {/* Middle row: Multi-line comparison chart and top trending table */}
        <div className={`trends-middle-grid${isStudent ? " student-basic" : ""}`}>

          {/* Card 2: Keyword/Topic Comparison */}
          <article className="trends-chart-panel glassmorphic-panel multi-line-comp-panel">
            <div className="panel-header-row">
              <h3>{isMultiSeriesComparison
                ? `${trendTab === "keyword" ? "Keyword" : "Topic"} Comparison`
                : `${trendTab === "keyword" ? "Keyword" : "Topic"} Publication Trend`}</h3>
              <span className="badge-chip badge-cyan">
                {canCompare
                  ? isMultiSeriesComparison ? "Multi-series comparison" : "Select 2–5 series"
                  : isLecturer ? "Lecturer basic trend" : "Student single trend"}
              </span>
            </div>

            {canCompare && (
              <div className="trend-compare-picker" aria-label="Choose trend series to compare">
                <div>
                  <span>Comparison set</span>
                  <strong>
                    {comparisonSelections.length}/5 selected
                    {comparisonSelections.length < 2 ? ` · ${2 - comparisonSelections.length} more required` : ""}
                  </strong>
                </div>
                <div className="trend-selected-options" aria-label="Selected trend series">
                  {comparisonSelections.map((term) => (
                    <span key={term}>
                      <FiCheck /> {term}
                      <button type="button" onClick={() => removeComparisonTerm(term)} aria-label={`Remove ${term}`}>
                        <FiX />
                      </button>
                    </span>
                  ))}
                  {comparisonSelections.length === 0 && <small>No series selected yet.</small>}
                </div>

                <div
                  className="trends-autocomplete trend-compare-search"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)
                      && !event.relatedTarget?.closest?.(".trends-autocomplete-menu-portal")) setSuggestionsOpen(false);
                  }}
                >
                  <div ref={suggestionAnchorRef} className="trends-search-box-wrap">
                    <FiSearch />
                    <input
                      type="text"
                      value={suggestionQuery}
                      onChange={(event) => {
                        setSuggestionQuery(event.target.value);
                        setSuggestionsOpen(true);
                      }}
                      onFocus={() => setSuggestionsOpen(suggestionQuery.trim().length >= 2)}
                      placeholder={`Search and add a ${trendTab}…`}
                      aria-label={`Search and add a ${trendTab} to comparison`}
                      aria-expanded={suggestionsOpen}
                      aria-controls="trend-compare-suggestions"
                    />
                  </div>
                  {suggestionsOpen && suggestionQuery.trim().length >= 2 && (
                    <TrendsSuggestionPortal anchorRef={suggestionAnchorRef} id="trend-compare-suggestions" isOpen={suggestionsOpen}>
                      {suggestionsLoading ? (
                        <span className="trends-autocomplete-state">Finding matches…</span>
                      ) : autocompleteSuggestions.length > 0 ? (
                        autocompleteSuggestions.map((suggestion) => (
                          <button
                            type="button"
                            role="option"
                            key={suggestion.value}
                            disabled={comparisonSelections.includes(suggestion.value)}
                            onMouseDown={(e) => {
                              if (!comparisonSelections.includes(suggestion.value)) {
                                e.preventDefault();
                                selectAutocompleteSuggestion(suggestion.value);
                              }
                            }}
                            onClick={() => selectAutocompleteSuggestion(suggestion.value)}
                          >
                            <span>{suggestion.value}</span>
                            <small>
                              {comparisonSelections.includes(suggestion.value)
                                ? "Selected"
                                : suggestion.paperCount > 0
                                  ? `${formatNumber(suggestion.paperCount)} papers`
                                  : "Add"}
                            </small>
                          </button>
                        ))
                      ) : (
                        <span className="trends-autocomplete-state">No matching {trendTab}s found.</span>
                      )}
                    </TrendsSuggestionPortal>
                  )}
                </div>

                <div className="trend-suggested-label">
                  <span>Suggested {trendTab}s</span>
                  <small>Choose a suggestion or search the catalog above</small>
                </div>
                <div className="trend-compare-options" aria-label={`Suggested ${trendTab}s`}>
                  {availableComparisonNames.slice(0, 10).map((term) => {
                    const selected = comparisonSelections.includes(term);
                    return (
                      <button
                        type="button"
                        key={term}
                        className={selected ? "is-selected" : ""}
                        onClick={() => addComparisonTerm(term)}
                        disabled={selected}
                        aria-pressed={selected}
                      >
                        {selected ? <FiCheck /> : <FiPlus />} {term}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {comparisonLines.length > 0 ? (
              <>
                {isMultiSeriesComparison && comparisonLines.length > 1 && <div className="trend-chart-guide">
                  <p>Click a card below to focus its line curve and reveal yearly values.</p>
                  {activeFocusedSeries !== "ALL" ? (
                    <button type="button" onClick={() => setFocusedSeries("ALL")}>Overview all series</button>
                  ) : (
                    <button type="button" onClick={() => setFocusedSeries(comparisonLines[0]?.label || "")}>Focus single line</button>
                  )}
                </div>}
                <div className="multi-line-legend-container" aria-label="Trend series">
                  {comparisonLines.map((series) => {
                    const isSelected = activeFocusedSeries === series.label;
                    return (
                      <button
                        type="button"
                        key={series.label}
                        className={`multi-line-legend-item ${isSelected ? "is-active" : ""} ${activeFocusedSeries !== "ALL" && !isSelected ? "is-muted" : ""}`}
                        style={{ "--series-color": series.color }}
                        onClick={() => setFocusedSeries(series.label)}
                        aria-pressed={isSelected}
                      >
                        <span className="legend-line-swatch" aria-hidden="true" />
                        <span className="legend-text" title={series.label}>
                          <strong>{series.label}</strong>
                          <small>{series.totalValStr} papers</small>
                        </span>
                        <span className="legend-latest-value" aria-label={`${series.finalYear}: ${series.finalValStr} papers`}>
                          <small>{series.finalYear}</small>
                          <strong>{series.finalValStr}</strong>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="trends-svg-chart-container">
                  <svg
                    viewBox={`0 0 ${COMPARISON_CHART_WIDTH} ${COMPARISON_CHART_HEIGHT}`}
                    className="trends-svg-chart multi-line-svg"
                    role="img"
                    aria-label={`${trendTab === "keyword" ? "Keyword" : "Topic"} publication comparison curves by year`}
                  >
                    <defs>
                      {comparisonLines.flatMap((series) => ([
                        <linearGradient key={series.strokeGradientId} id={series.strokeGradientId} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={series.color} stopOpacity="0.75" />
                          <stop offset="48%" stopColor={series.color} stopOpacity="1" />
                          <stop offset="100%" stopColor={series.color} stopOpacity="0.85" />
                        </linearGradient>,
                        <linearGradient key={series.areaGradientId} id={series.areaGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={series.color} stopOpacity="0.25" />
                          <stop offset="100%" stopColor={series.color} stopOpacity="0.01" />
                        </linearGradient>,
                      ]))}
                    </defs>
                    <rect
                      x={COMPARISON_PLOT_LEFT}
                      y={COMPARISON_PLOT_TOP}
                      width={COMPARISON_CHART_WIDTH - COMPARISON_PLOT_LEFT - COMPARISON_PLOT_RIGHT}
                      height={COMPARISON_PLOT_HEIGHT - COMPARISON_PLOT_TOP - COMPARISON_PLOT_BOTTOM}
                      rx="16"
                      className="trend-chart-plot-background"
                    />
                    <g className="trend-chart-grid" aria-hidden="true">
                      {COMPARISON_GRID_LEVELS.map((level) => {
                        const gridY = COMPARISON_PLOT_TOP
                          + (1 - level)
                          * (COMPARISON_PLOT_HEIGHT - COMPARISON_PLOT_TOP - COMPARISON_PLOT_BOTTOM);
                        return (
                          <g key={level}>
                            <line
                              x1={COMPARISON_PLOT_LEFT}
                              y1={gridY}
                              x2={COMPARISON_CHART_WIDTH - COMPARISON_PLOT_RIGHT}
                              y2={gridY}
                              className="trend-chart-grid-line"
                            />
                            <text
                              x={COMPARISON_PLOT_LEFT - 9}
                              y={gridY}
                              textAnchor="end"
                              dominantBaseline="middle"
                              className="trend-chart-grid-label"
                            >
                              {formatNumber(Math.round((comparisonLines[0]?.axisMax ?? 0) * level))}
                            </text>
                          </g>
                        );
                      })}
                    </g>

                    {/* Multi-Line Curves */}
                    {comparisonLines.map((series) => {
                      const isFocused = activeFocusedSeries === series.label;
                      const isMuted = activeFocusedSeries !== "ALL" && !isFocused;
                      return (
                        <g key={series.label} className={`trend-line-series ${isFocused ? "is-focused" : ""} ${isMuted ? "is-muted" : ""}`}>
                          {isFocused && series.areaPath && (
                            <path d={series.areaPath} fill={`url(#${series.areaGradientId})`} className="trend-line-area" />
                          )}
                          <path
                            d={series.linePath}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={isFocused ? "7.5" : "5.5"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="trend-line-halo"
                          />
                          <path
                            d={series.linePath}
                            fill="none"
                            stroke={`url(#${series.strokeGradientId})`}
                            strokeWidth={isFocused ? "5.2" : "3.8"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="trend-smooth-line"
                          />
                          {series.coords.map((point) => (
                            <g key={point.label} className="trend-line-point">
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isFocused ? "6" : "4.8"}
                                fill="#ffffff"
                                stroke={series.color}
                                strokeWidth={isFocused ? "3.2" : "2.4"}
                                vectorEffect="non-scaling-stroke"
                              >
                                <title>{`${series.label} (${point.label}): ${formatNumber(point.value)} papers`}</title>
                              </circle>
                              {isFocused && activeFocusedSeries !== "ALL" && (
                                <text
                                  x={point.x}
                                  y={Math.max(COMPARISON_PLOT_TOP + 10, point.y - 12)}
                                  textAnchor="middle"
                                  className="trend-line-value"
                                >
                                  {formatNumber(point.value)}
                                </text>
                              )}
                            </g>
                          ))}
                        </g>
                      );
                    })}
                    <g className="trend-chart-axis" aria-hidden="true">
                      <line
                        x1={COMPARISON_PLOT_LEFT}
                        y1={COMPARISON_PLOT_HEIGHT - COMPARISON_PLOT_BOTTOM}
                        x2={COMPARISON_CHART_WIDTH - COMPARISON_PLOT_RIGHT}
                        y2={COMPARISON_PLOT_HEIGHT - COMPARISON_PLOT_BOTTOM}
                        className="trend-chart-axis-line"
                      />
                    {comparisonLines[0]?.coords.map((point) => (
                      <text
                        key={point.label}
                        x={point.x}
                        y={COMPARISON_PLOT_HEIGHT - COMPARISON_PLOT_BOTTOM + 24}
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
                {chartLoading || comparisonLoading
                  ? "Loading data…"
                  : !singleTrendTerm && !isMultiSeriesComparison
                    ? `Search and select a ${trendTab} to view its yearly publication trend.`
                    : `No yearly publication data is available for the selected ${trendTab}${isMultiSeriesComparison ? "s" : ""}.`}
              </div>
            )}
          </article>

          {/* Card 3: Top Trending Topics list — hidden from STUDENT */}
          {canViewTopTrending && (
          <article className="trends-table-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>
                {metadataSource[trendTab] === "trend"
                  ? `Top Trending ${trendTab === "keyword" ? "Keywords" : "Topics"}`
                  : `Top Catalog ${trendTab === "keyword" ? "Keywords" : "Topics"}`}
              </h3>
              <span className="badge-chip badge-amber">
                Top 5
              </span>
            </div>
            <div className="trends-compact-table-wrap">
              <table className="trends-compact-table">
                <thead>
                  <tr>
                    <th style={{ width: "52%" }}>{trendTab === "keyword" ? "Keyword" : "Topic"}</th>
                    <th style={{ width: "48%", textAlign: "right" }}>Publications</th>
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
          )}

        </div>

        {/* Bottom row: Top Growing list, Topic Momentum list, Insights text boxes — hidden from STUDENT */}
        {canCompare && (
        <div className="trends-bottom-grid">
          
          {/* Card 1: Top Growing Topics */}
          <article className="trends-bottom-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>{trendTab === "keyword" ? "Keyword Growth Signals" : "Topic Growth Signals"}</h3>
              <span className="badge-chip badge-emerald">Period change</span>
            </div>
            <div className="trends-sparkline-list">
              {topGrowingItems.map((item, idx) => (
                <div key={item.id ?? idx} className={`trends-sparkline-row row-color-${idx % 3}`}>
                  <div className="topic-rank-name">
                    <span className={`bullet-dot ${idx === 0 ? "bullet-emerald" : idx === 1 ? "bullet-purple" : "bullet-rose"}`} />
                    <span className="name">{item.name}</span>
                  </div>
                  <div className="sparkline-stats">
                    {item.growthDerived && <small className="growth-source-label">Yearly trend</small>}
                    <span className={`growth-pill-${idx === 0 ? "vivid" : idx === 1 ? "purple" : "rose"}`}>{item.growth || "—"}</span>
                  </div>
                </div>
              ))}
              {topGrowingItems.length === 0 && (
                <div className="chart-empty-placeholder" style={{ padding: "30px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  {comparisonLoading ? "Calculating growth from yearly data…" : "No comparable yearly growth data is available."}
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
              {mostActiveItems.map((item, idx) => (
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
              {mostActiveItems.length === 0 && (
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
                activeTrendItems.slice(0, 5).map((item, idx) => (
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
        )}

      </div>
    </MainLayout>
  );
}

export default TrendsPage;
