import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiLayers,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { compareTrends, getTrendingKeywords, getTrendingTopics, getTrendStats } from "../services/trendService";
import { getDashboardOverview } from "../services/dashboardService";
import { getAllKeywords } from "../services/keywordService";
import { getAllTopics } from "../services/topicService";
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

const TRENDS_METADATA_CACHE_KEY = "trends_metadata_v7";
const COMPARISON_CHART_WIDTH = 760;
const COMPARISON_CHART_HEIGHT = 300;
const COMPARISON_PLOT_HEIGHT = 250;
const COMPARISON_PLOT_LEFT = 48;
const COMPARISON_PLOT_RIGHT = 24;
const COMPARISON_PLOT_TOP = 22;
const COMPARISON_PLOT_BOTTOM = 25;
const COMPARISON_GRID_LEVELS = [1, 0.75, 0.5, 0.25, 0];

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

function sortCatalogTopics(topics) {
  return [...topics]
    .sort((left, right) => (
      Number(right?.paperCount || 0) - Number(left?.paperCount || 0)
      || String(left?.name || "").localeCompare(String(right?.name || ""))
    ));
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
  const { role, user } = useAuth();
  const normalizedRole = String(role || user?.role || "LECTURER").toUpperCase();
  const canCompareTrends = ["RESEARCHER", "ADMIN"].includes(normalizedRole);
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
  const [comparisonSelections, setComparisonSelections] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [focusedSeries, setFocusedSeries] = useState("");
  const [metadataSource, setMetadataSource] = useState(
    initialTrendData.metadata?.sources ?? { keyword: "trend", topic: "trend" },
  );
  const { toast, showToast } = useToast();

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
      setMetadataSource(metadata.sources ?? { keyword: "trend", topic: "trend" });
    }

    if (cached) {
      applyMetadata(cached);
      setMetadataLoading(false);
    }

    async function loadMetadata() {
      const [topicTrendResult, keywordTrendResult, dashboardResult, keywordCatalogResult, topicCatalogResult] = await Promise.allSettled([
        getTrendingTopics({ limit: 10 }),
        getTrendingKeywords({ limit: 10 }),
        getDashboardOverview(),
        getAllKeywords(),
        getAllTopics(),
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
      const catalogKeywords = keywordCatalogResult.status === "fulfilled"
        ? normalizeTrendKeywords(keywordCatalogResult.value)
        : [];
      const catalogTopics = topicCatalogResult.status === "fulfilled"
        ? sortCatalogTopics(normalizeTrendTopics(topicCatalogResult.value))
        : [];
      const dashboardKeywords = getDashboardKeywordFallback(nextDashboard);

      const keywordFallback = dashboardKeywords.length > 0
        ? dashboardKeywords
        : catalogKeywords.slice(0, 10);
      const nextKeywords = liveKeywords.length > 0
        ? liveKeywords
        : keywordFallback;
      const nextTopics = liveTopics.length > 0
        ? liveTopics
        : catalogTopics.slice(0, 10);
      const nextMetadata = {
        dbKeywords: nextKeywords.length > 0 ? nextKeywords : (cached?.dbKeywords ?? []),
        trendingTopics: nextTopics.length > 0 ? nextTopics : (cached?.trendingTopics ?? []),
        dashboard: hasUsableDashboard(nextDashboard) ? nextDashboard : (cached?.dashboard ?? null),
        sources: {
          keyword: liveKeywords.length > 0 ? "trend" : "catalog",
          topic: liveTopics.length > 0 ? "trend" : "catalog",
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
    if (!canCompareTrends) return;
    setComparisonSelections((current) => {
      const available = new Set(availableComparisonNames);
      const retained = current.filter((name) => available.has(name)).slice(0, 4);
      if (retained.length >= 2) return retained;
      return availableComparisonNames.slice(0, 4);
    });
  }, [availableComparisonNames, canCompareTrends, trendTab]);

  const comparisonTermKey = useMemo(() => (
    canCompareTrends ? comparisonSelections : [activeTrendTerm].filter(Boolean)
  ).join("\u0001"), [activeTrendTerm, canCompareTrends, comparisonSelections]);

  function toggleComparisonTerm(term) {
    const isSelected = comparisonSelections.includes(term);
    if (isSelected && comparisonSelections.length <= 2) {
      showToast("Select at least two items for Compare Trends.", "warning");
      return;
    }
    if (!isSelected && comparisonSelections.length >= 4) {
      showToast("Compare Trends supports up to four items.", "warning");
      return;
    }
    setComparisonSelections(isSelected
      ? comparisonSelections.filter((item) => item !== term)
      : [...comparisonSelections, term]);
  }

  useEffect(() => {
    setFocusedSeries("");
  }, [comparisonTermKey, trendTab]);

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
      if (canCompareTrends && terms.length >= 2) {
        const currentYear = new Date().getFullYear();
        const periodYears = timeRange === "3y" ? 3 : timeRange === "5y" ? 5 : 8;
        try {
          const response = await compareTrends({
            type: trendTab,
            items: terms,
            fromYear: currentYear - periodYears + 1,
            toYear: currentYear,
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
  }, [canCompareTrends, comparisonTermKey, timeRange, trendTab]);

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
    const height = COMPARISON_PLOT_HEIGHT;
    const paddingLeft = COMPARISON_PLOT_LEFT;
    const paddingRight = COMPARISON_PLOT_RIGHT;
    const paddingTop = COMPARISON_PLOT_TOP;
    const paddingBottom = COMPARISON_PLOT_BOTTOM;
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
    const axisMax = Math.max(2, maxVal);
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const plotBaseY = height - paddingBottom;

    return comparisonSeries.map((series, seriesIndex) => {
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
  }, [comparisonSeries, timeRange]);

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
              <span>{metadataSource[trendTab] === "catalog" ? "Live Catalog Analytics" : "Live Trend Analytics"}</span>
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
              <span className="sub">{canCompareTrends ? "Available for trend comparison" : "Available for trend analysis"}</span>
            </span>
          </div>
        </div>

        {/* Middle row: Multi-line comparison chart and top trending table */}
        <div className="trends-middle-grid">

          {/* Card 2: Keyword/Topic Comparison */}
          <article className="trends-chart-panel glassmorphic-panel multi-line-comp-panel">
            <div className="panel-header-row">
              <h3>{canCompareTrends
                ? `${trendTab === "keyword" ? "Keyword" : "Topic"} Comparison`
                : `${trendTab === "keyword" ? "Keyword" : "Topic"} Publication Trend`}</h3>
              <span className="badge-chip badge-cyan">{canCompareTrends ? "Compare 2–4 series" : "Basic trend access"}</span>
            </div>

            {canCompareTrends && (
              <div className="trend-compare-picker" aria-label="Choose trend series to compare">
                <div>
                  <span>Comparison set</span>
                  <strong>{comparisonSelections.length}/4 selected</strong>
                </div>
                <div className="trend-compare-options">
                  {availableComparisonNames.slice(0, 8).map((term) => {
                    const selected = comparisonSelections.includes(term);
                    return (
                      <button
                        type="button"
                        key={term}
                        className={selected ? "is-selected" : ""}
                        onClick={() => toggleComparisonTerm(term)}
                        aria-pressed={selected}
                      >
                        {selected && <FiCheck />} {term}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {comparisonLines.length > 0 ? (
              <>
                <div className="trend-chart-guide">
                  <p>Click a card below to focus its line curve and reveal yearly values.</p>
                  {activeFocusedSeries !== "ALL" ? (
                    <button type="button" onClick={() => setFocusedSeries("ALL")}>Overview all series</button>
                  ) : (
                    <button type="button" onClick={() => setFocusedSeries(comparisonLines[0]?.label || "")}>Focus single line</button>
                  )}
                </div>
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
                {comparisonLoading
                  ? "Loading data…"
                  : `No yearly publication data is available for these ${trendTab}s.`}
              </div>
            )}
          </article>

          {/* Card 3: Top Trending Topics list */}
          <article className="trends-table-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>
                {metadataSource[trendTab] === "catalog"
                  ? `Top Catalog ${trendTab === "keyword" ? "Keywords" : "Topics"}`
                  : `Top Trending ${trendTab === "keyword" ? "Keywords" : "Topics"}`}
              </h3>
              <span className="badge-chip badge-amber">
                {metadataSource[trendTab] === "catalog" ? "Catalog ranked" : "Top 5"}
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

        </div>

        {/* Bottom row: Top Growing list, Topic Momentum list, Insights text boxes */}
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
