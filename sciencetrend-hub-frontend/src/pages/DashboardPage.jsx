import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiRefreshCw,
  FiActivity,
  FiFileText,
  FiBookOpen,
  FiKey,
  FiTag,
  FiDatabase,
  FiArrowUpRight,
  FiCheckCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiGitBranch,
  FiAward,
  FiClock,
  FiTarget,
  FiZap,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { getDashboardHome } from "../services/dashboardService";
import {
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  normalizeDashboardHome,
  normalizeTopic,
} from "../utils/apiData";

import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import "../styles/DashboardPage.css";

const DONUT_THEMES = [
  { color: "#10b981", bgColor: "#ecfdf5", textColor: "#047857" },
  { color: "#6366f1", bgColor: "#eef2ff", textColor: "#3730a3" },
  { color: "#8b5cf6", bgColor: "#f5f3ff", textColor: "#5b21b6" },
  { color: "#f59e0b", bgColor: "#fffbeb", textColor: "#b45309" },
  { color: "#ec4899", bgColor: "#fdf2f8", textColor: "#be185d" },
];

function getDashboardCacheKeys(user = {}, role = "STUDENT") {
  const userId = user.id ?? user.userId ?? user.username ?? "anon";
  const roleKey = String(role || "STUDENT").toUpperCase();
  return {
    overview: `dashboard_overview_v5_${roleKey}_${userId}`,
    topics: `dashboard_trending_topics_v4_${roleKey}_${userId}`,
  };
}

function hasDashboardData(data) {
  return Boolean(data)
    && (
      data.totalPapers > 0
      || data.totalJournals > 0
      || data.totalKeywords > 0
      || data.totalTopics > 0
      || (
        Array.isArray(data.papersByYear)
        && data.papersByYear.some((point) => Number(point?.value) > 0)
      )
    );
}

function getInitialDashboardData(cacheKeys) {
  try {
    const overview = getPersistentCachedData(cacheKeys.overview);
    const topics = getPersistentCachedData(cacheKeys.topics);

    return {
      overview: hasDashboardData(overview) ? overview : null,
      topics: Array.isArray(topics) && topics.length > 0 ? topics : [],
    };
  } catch (err) {
    console.warn("Dashboard cache corrupted, clearing:", err);
    try {
      window.localStorage.removeItem("sciencetrend_api_cache_v1");
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
    return { overview: null, topics: [] };
  }
}

function formatDecimal(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatAxisValue(value) {
  const numericValue = Number(value) || 0;
  if (numericValue >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (numericValue >= 1_000) return `${(numericValue / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return formatNumber(Math.round(numericValue));
}

function DashboardPage() {
  const { user, role } = useAuth();
  const normalizedRole = String(role || user?.role || "STUDENT").toUpperCase();
  const cacheKeys = useMemo(() => getDashboardCacheKeys(user, normalizedRole), [normalizedRole, user]);
  const [initialData] = useState(() => getInitialDashboardData(cacheKeys));
  const [data, setData] = useState(initialData.overview);
  const [trendingTopics, setTrendingTopics] = useState(initialData.topics);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [operationsData, setOperationsData] = useState(null);
  const [capabilitiesData, setCapabilitiesData] = useState(null);
  const [loading, setLoading] = useState(!initialData.overview && initialData.topics.length === 0);
  const [spinning, setSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const canUseAnalytics = capabilitiesData?.canViewResearchAnalytics
    ?? ["LECTURER", "RESEARCHER", "ADMIN"].includes(normalizedRole);
  const canManageSystem = capabilitiesData?.canManageSystem ?? normalizedRole === "ADMIN";
  const canAccessResearchLab = ["RESEARCHER", "ADMIN"].includes(normalizedRole);
  const canComparePapers = capabilitiesData?.canComparePapers
    ?? ["RESEARCHER", "ADMIN"].includes(normalizedRole);
  const canCompareTrends = capabilitiesData?.canCompareTrends
    ?? ["RESEARCHER", "ADMIN"].includes(normalizedRole);
  const canGenerateBasicReport = capabilitiesData?.canGenerateBasicReport
    ?? ["LECTURER", "RESEARCHER", "ADMIN"].includes(normalizedRole);
  const canGenerateAdvancedReport = capabilitiesData?.canGenerateAdvancedReport
    ?? ["RESEARCHER", "ADMIN"].includes(normalizedRole);
  const mindMapAccess = String(
    capabilitiesData?.mindMapAccess
      ?? (normalizedRole === "LECTURER" ? "BASIC" : ["RESEARCHER", "ADMIN"].includes(normalizedRole) ? "FULL" : "NONE"),
  ).toUpperCase();

  const [vietnamClock, setVietnamClock] = useState(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date());
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setVietnamClock(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(new Date())
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    const storedOverview = getPersistentCachedData(cacheKeys.overview);
    const storedTopics = getPersistentCachedData(cacheKeys.topics);
    const cachedOverview = hasDashboardData(storedOverview) ? storedOverview : null;
    const cachedTopics = Array.isArray(storedTopics) && storedTopics.length > 0 ? storedTopics : [];
    const hasCachedData = Boolean(cachedOverview) || cachedTopics.length > 0;

    if (hasCachedData && !isRefresh) {
      if (cachedOverview) setData(cachedOverview);
      if (cachedTopics.length > 0) setTrendingTopics(cachedTopics);
      setLoading(false);
    }

    try {
      if (isRefresh) setSpinning(true);
      else if (!hasCachedData) setLoading(true);
      setErrorMessage("");

      // One role-aware contract supplies overview, analytics, operations and capabilities.
      const homeRes = await getDashboardHome();
      const homeData = normalizeDashboardHome(homeRes);

      if (homeData && homeData.overview) {
        setData(homeData.overview);
        setPersistentCachedData(cacheKeys.overview, homeData.overview);
        setErrorMessage("");
      }
      setAnalyticsData(homeData.analytics);
      setOperationsData(homeData.operations);
      setCapabilitiesData(homeData.capabilities);

      const normTopics = (homeData.analytics?.topTrendingTopics || [])
        .map(normalizeTopic)
        .filter((topic) => topic.name !== "Untitled topic")
        .slice(0, 3);
      setTrendingTopics(normTopics);
      setPersistentCachedData(cacheKeys.topics, normTopics);
    } catch (error) {
      console.error("Cannot load dashboard", error);
      if (!hasCachedData) {
        setErrorMessage("Couldn't load dashboard data. Please verify your connection.");
      }
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, [cacheKeys]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const displayName = user?.username || user?.fullName || user?.email || "";
  const dashboardSubtitle = displayName
    ? `Welcome back, ${displayName} 👋`
    : "Explore the latest data available in the research catalog";

  const dashboardStats = useMemo(() => {
    const totalPapers = data?.totalPapers ?? 0;
    const totalJournals = data?.totalJournals ?? 0;
    const totalKeywords = data?.totalKeywords ?? 0;
    const totalTopics = data?.totalTopics ?? 0;

    const stats = [
      {
        title: "Total Papers",
        value: formatNumber(totalPapers),
        icon: FiFileText,
        change: "Current",
        trendText: "catalog total",
        trendType: "neutral",
        themeClass: "kpi-theme-emerald",
        to: "/papers",
      },
      {
        title: "Journals",
        value: formatNumber(totalJournals),
        icon: FiBookOpen,
        change: "Current",
        trendText: "catalog total",
        trendType: "neutral",
        themeClass: "kpi-theme-indigo",
        to: "/journals",
      },
      {
        title: "Keywords",
        value: formatNumber(totalKeywords),
        icon: FiKey,
        change: "Current",
        trendText: "catalog total",
        trendType: "neutral",
        themeClass: "kpi-theme-purple",
        to: "/keywords",
      },
      {
        title: "Topics",
        value: formatNumber(totalTopics),
        icon: FiTag,
        change: "Current",
        trendText: "catalog total",
        trendType: "neutral",
        themeClass: "kpi-theme-amber",
        to: "/topics",
      }
    ];

    if (canUseAnalytics) {
      const growthRate = Number(analyticsData?.publicationGrowthRate ?? 0);
      const growthPercent = growthRate * 100;
      const latestYear = analyticsData?.latestCompleteYear || "latest year";
      const previousYear = analyticsData?.previousCompleteYear || "previous year";
      stats.push(
        {
          title: "Total Citations",
          value: formatNumber(analyticsData?.totalCitations ?? 0),
          icon: FiActivity,
          change: "Impact",
          trendText: "catalog citations",
          trendType: "neutral",
          themeClass: "kpi-theme-indigo",
          to: "/papers",
        },
        {
          title: "Avg Citations / Paper",
          value: formatDecimal(analyticsData?.averageCitationsPerPaper),
          icon: FiArrowUpRight,
          change: "Average",
          trendText: "per publication",
          trendType: "neutral",
          themeClass: "kpi-theme-purple",
          to: "/papers",
        },
        {
          title: "Publication Growth",
          value: `${growthPercent > 0 ? "+" : ""}${formatDecimal(growthPercent)}%`,
          icon: growthRate < 0 ? FiTrendingDown : FiTrendingUp,
          change: growthRate > 0 ? "Growing" : growthRate < 0 ? "Declining" : "Stable",
          trendText: `${previousYear} to ${latestYear}`,
          trendType: growthRate > 0 ? "positive" : growthRate < 0 ? "negative" : "neutral",
          themeClass: growthRate < 0 ? "kpi-theme-rose" : "kpi-theme-emerald",
          to: "/trends",
        },
        {
          title: "High-Impact Papers",
          value: formatNumber(analyticsData?.highImpactPaperCount ?? 0),
          icon: FiCheckCircle,
          change: "Cited",
          trendText: "high-impact records",
          trendType: "neutral",
          themeClass: "kpi-theme-amber",
          to: "/papers",
        },
      );
    }

    return stats;
  }, [analyticsData, canUseAnalytics, data]);

  const papersByYear = useMemo(() => {
    const raw = data?.papersByYear || [];
    if (!Array.isArray(raw) || !raw.some((point) => Number(point?.value) > 0)) return [];
    const sorted = [...raw].sort((a, b) => parseInt(a.label || 0) - parseInt(b.label || 0));

    if (sorted.length > 0) {
      const minYear = parseInt(sorted[0].label || 0);
      const maxYear = parseInt(sorted[sorted.length - 1].label || 0);
      if (minYear > 1900 && maxYear >= minYear && maxYear - minYear <= 15) {
        const yearMap = new Map(sorted.map((item) => [parseInt(item.label || 0), Number(item.value || 0)]));
        const filled = [];
        for (let y = minYear; y <= maxYear; y++) {
          filled.push({ label: String(y), value: yearMap.get(y) || 0 });
        }
        return filled.slice(-8);
      }
    }
    return sorted.slice(-8);
  }, [data]);

  const activitySummary = useMemo(() => {
    if (!papersByYear || papersByYear.length === 0) return null;
    let peak = papersByYear[0];
    let sum = 0;
    papersByYear.forEach((p) => {
      sum += Number(p.value || 0);
      if (Number(p.value || 0) > Number(peak.value || 0)) peak = p;
    });
    const avg = Math.round(sum / papersByYear.length);
    return { peak, total: sum, avg };
  }, [papersByYear]);

  const topKeywords = useMemo(() => {
    let raw = Array.isArray(data?.topKeywords) ? data.topKeywords : [];
    return raw.filter((item) => item && typeof item === "object" && Number(item.value) > 0);
  }, [data]);

  const topJournals = useMemo(() => {
    let raw = Array.isArray(data?.topJournals) ? data.topJournals : [];
    return raw.filter((item) => item && typeof item === "object" && Number(item.value) > 0);
  }, [data]);

  const topCitedPapers = useMemo(() => {
    let raw = Array.isArray(data?.topCitedPapers) ? data.topCitedPapers : [];
    return raw.slice(0, 10);
  }, [data]);

  const featuredPaper = useMemo(() => {
    if (!Array.isArray(topCitedPapers) || topCitedPapers.length === 0) return null;
    // Rotate daily: pick a different paper based on current date
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const idx = dayOfYear % topCitedPapers.length;
    const pick = topCitedPapers[idx];
    if (!pick || typeof pick !== "object" || !pick.title) return topCitedPapers[0] || null;
    return pick;
  }, [topCitedPapers]);

  const donutSegments = useMemo(() => {
    const sliceJournals = (Array.isArray(topJournals) ? topJournals : []).slice(0, 5);
    const sum = sliceJournals.reduce((acc, curr) => acc + (Number(curr?.value) || 0), 0);
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76
    return sliceJournals.map((j, i) => {
      const val = Number(j?.value) || 0;
      const percent = sum > 0 ? val / sum : 0;
      const cumulativePercent = sliceJournals
        .slice(0, i)
        .reduce((total, item) => total + (sum > 0 ? (Number(item?.value) || 0) / sum : 0), 0);
      const strokeLength = percent * circumference;
      const strokeOffset = circumference - (cumulativePercent * circumference);

      const theme = DONUT_THEMES[i % DONUT_THEMES.length];
      return {
        label: j?.label || "Journal",
        value: val,
        percent: (percent * 100).toFixed(1),
        strokeLength,
        strokeOffset,
        color: theme.color,
        bgColor: theme.bgColor,
        textColor: theme.textColor,
      };
    });
  }, [topJournals]);

  const maxKeywordVal = useMemo(() => {
    if (!Array.isArray(topKeywords) || topKeywords.length === 0) return 1;
    const vals = topKeywords.map((k) => Number(k?.value) || 0);
    return Math.max(...vals, 1);
  }, [topKeywords]);

  const yAxisScale = useMemo(() => {
    const values = (Array.isArray(papersByYear) ? papersByYear : []).map((p) => Number(p?.value) || 0);
    const rawMax = Math.max(...values, 1);
    const roughStep = rawMax / 4;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
    const normalizedStep = roughStep / magnitude;
    const stepMultiplier = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
    const step = Math.max(1, stepMultiplier * magnitude);
    const maxScale = Math.max(step, Math.ceil((rawMax * 1.2) / step) * step);

    return {
      maxScale,
      labels: [
        formatAxisValue(maxScale),
        formatAxisValue(maxScale * 0.66),
        formatAxisValue(maxScale * 0.33),
        "0",
      ],
    };
  }, [papersByYear]);

  const quickActions = useMemo(() => {
    const actions = [];
    if (canManageSystem) actions.push({ label: "Admin Panel", to: "/admin", icon: FiDatabase });
    if (canAccessResearchLab && canComparePapers) actions.push({ label: "Compare Papers", to: "/research-lab", icon: FiGitBranch });
    if (canAccessResearchLab && (mindMapAccess === "BASIC" || mindMapAccess === "FULL")) {
      actions.push({ label: `Mind Map ${mindMapAccess === "BASIC" ? "Basic" : "Full"}`, to: "/research-lab", icon: FiGitBranch });
    }
    if (canGenerateAdvancedReport) actions.push({ label: "Advanced Report", to: "/reports", icon: FiFileText });
    else if (canGenerateBasicReport) actions.push({ label: "Generate Report", to: "/reports", icon: FiFileText });
    if (canCompareTrends) actions.push({ label: "Compare Trends", to: "/trends", icon: FiTrendingUp });

    if (actions.length > 0) return actions.slice(0, 4);
    return [
      { label: "Browse Papers", to: "/papers", icon: FiFileText },
      { label: "Explore Topics", to: "/topics", icon: FiTag },
      { label: "View Journals", to: "/journals", icon: FiBookOpen },
    ];
  }, [canAccessResearchLab, canComparePapers, canCompareTrends, canGenerateAdvancedReport, canGenerateBasicReport, canManageSystem, mindMapAccess]);

  const primaryStats = dashboardStats.slice(0, 4);
  const supportingStats = dashboardStats.slice(4);
  const latestPublication = papersByYear.at(-1) ?? null;
  const leadingJournal = topJournals[0] ?? null;
  const leadingTopic = trendingTopics[0] ?? null;
  const leadingKeyword = topKeywords[0] ?? null;
  const roleWorkspaceLabel = normalizedRole === "ADMIN"
    ? "Admin research intelligence"
    : normalizedRole === "RESEARCHER"
      ? "Researcher intelligence workspace"
      : normalizedRole === "LECTURER"
        ? "Lecturer evidence workspace"
        : "Research discovery workspace";
  const briefingAction = canAccessResearchLab && (mindMapAccess === "BASIC" || mindMapAccess === "FULL")
    ? { label: "Open Research Lab", to: "/research-lab" }
    : { label: "Explore Papers", to: "/papers" };
  const researchBriefs = [
    {
      label: "Publication momentum",
      title: latestPublication
        ? `${latestPublication.label}: ${formatNumber(latestPublication.value)} indexed papers`
        : "Yearly publication activity is awaiting data",
      description: activitySummary
        ? `Peak activity was ${activitySummary.peak.label} with ${formatNumber(activitySummary.peak.value)} publications.`
        : "Refresh the catalog to surface publication momentum.",
      icon: FiTrendingUp,
      tone: "cyan",
      to: latestPublication ? `/papers?yearFrom=${latestPublication.label}&yearTo=${latestPublication.label}` : "/papers",
    },
    {
      label: "Journal concentration",
      title: leadingJournal?.label || "No leading journal is available yet",
      description: leadingJournal
        ? `${formatNumber(leadingJournal.value)} indexed papers in the catalog's leading source.`
        : "Journal coverage will appear after publications are indexed.",
      icon: FiBookOpen,
      tone: "violet",
      to: "/journals",
    },
    {
      label: "Discovery signal",
      title: leadingTopic?.name || leadingKeyword?.label || "No emerging signal detected yet",
      description: leadingTopic
        ? "The strongest topic signal currently available for deeper exploration."
        : leadingKeyword
          ? `${formatNumber(leadingKeyword.value)} papers share this recurring keyword.`
          : "Follow topics and keywords to build a discovery signal.",
      icon: FiTarget,
      tone: "amber",
      to: leadingTopic ? "/topics" : "/keywords",
    },
  ];

  function renderMetricCard(stat, variant = "primary") {
    const Icon = stat.icon;
    const TrendIcon = stat.change === "—" || stat.trendType === "neutral"
      ? FiMinus
      : stat.trendType === "negative"
        ? FiTrendingDown
        : FiTrendingUp;

    const MetricCard = stat.to ? Link : "article";

    return (
      <MetricCard
        key={stat.title}
        className={`db-kpi-card db-kpi-card--${variant} ${stat.themeClass || ""}`}
        aria-label={`${stat.title}: ${stat.value}`}
        {...(stat.to ? { to: stat.to } : {})}
      >
        <div className="db-kpi-card-header">
          <span className="db-kpi-label">{stat.title}</span>
          <div className="db-kpi-icon" aria-hidden="true">
            <Icon />
          </div>
        </div>
        <strong className="db-kpi-value">{stat.value}</strong>
        <div className="db-kpi-meta">
          <span className={`db-kpi-change ${stat.trendType}`}>
            <TrendIcon aria-hidden="true" />
            {stat.change}
          </span>
          <span className="db-kpi-comparison">{stat.trendText}</span>
          {stat.to && <FiArrowUpRight className="db-kpi-open" aria-hidden="true" />}
        </div>
      </MetricCard>
    );
  }

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle={dashboardSubtitle}>
        <div className="cm-loading page-loading-state" style={{ minHeight: "60vh" }}>
          <div className="cm-spinner" />
          <p style={{ fontWeight: "750", color: "#60a5fa", fontSize: "16px" }}>Loading dashboard overview statistics...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle={dashboardSubtitle}>
      <div className="premium-dashboard dashboard-v5">

        <section className="db-v4-hero" aria-labelledby="dashboard-control-title">
          <div className="db-v4-hero-copy">
            <span className="db-v4-eyebrow"><FiActivity /> Research command center</span>
            <h2 id="dashboard-control-title">Turn catalog signals into your next research move.</h2>
            <p>Track publication momentum, identify high-impact evidence, and move directly into the tools that support your next decision.</p>
            <div className="db-v5-context-row" aria-label="Workspace context">
              <span><FiCheckCircle /> {roleWorkspaceLabel}</span>
              <span><FiActivity /> Live evidence signals</span>
            </div>
            <div className="db-v4-hero-actions" aria-label="Workspace shortcuts">
              {quickActions.map(({ label, to, icon: Icon }, index) => (
                <Link key={label} to={to} className={index === 0 ? "is-primary" : ""}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                  {index === 0 && <FiArrowUpRight aria-hidden="true" />}
                </Link>
              ))}
            </div>
          </div>

          <aside className="db-v4-snapshot" aria-label="Current catalog snapshot">
            <div className="db-v4-snapshot-status">
              <span
                className={hasDashboardData(data) ? "is-ready" : ""}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "5px 14px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 850,
                  border: "1px solid rgba(110, 231, 183, 0.45)",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(52, 211, 153, 0.15))",
                  color: "#6ee7b7",
                  boxShadow: "0 2px 10px rgba(16, 185, 129, 0.2)"
                }}
              >
                <i />
                {hasDashboardData(data) ? "Live catalog" : "Awaiting data"}
              </span>
              <small className="vn-clock-badge" title="Live Vietnam Time (ICT UTC+7)"><FiClock /> ICT {vietnamClock}</small>
            </div>
            <div className="db-v4-snapshot-total">
              <span>Indexed papers</span>
              <strong>{formatNumber(data?.totalPapers ?? 0)}</strong>
            </div>
            <dl className="db-v4-snapshot-list">
              <div>
                <dt>Latest output</dt>
                <dd>{latestPublication ? `${latestPublication.label} · ${formatNumber(latestPublication.value)} papers` : "Not available"}</dd>
              </div>
              <div>
                <dt>Leading journal</dt>
                <dd title={leadingJournal?.label}>{leadingJournal?.label || "Not available"}</dd>
              </div>
              <div>
                <dt>Topic to watch</dt>
                <dd title={leadingTopic?.name}>{leadingTopic?.name || "Not available"}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="db-v4-refresh"
              onClick={() => loadDashboard(true)}
              disabled={spinning}
            >
              <FiRefreshCw className={spinning ? "is-spinning" : ""} />
              <span>{spinning ? "Refreshing data..." : "Refresh catalog data"}</span>
            </button>
          </aside>
        </section>

        <section className="db-research-briefing" aria-labelledby="research-briefing-title">
          <header className="db-briefing-header">
            <div className="db-briefing-heading">
              <span><FiZap aria-hidden="true" /></span>
              <div>
                <small>Research briefing</small>
                <h2 id="research-briefing-title">Three signals worth your attention</h2>
              </div>
            </div>
            <Link to={briefingAction.to} className="db-briefing-action">
              {briefingAction.label} <FiArrowUpRight aria-hidden="true" />
            </Link>
          </header>
          <div className="db-briefing-grid">
            {researchBriefs.map(({ label, title, description, icon: Icon, tone, to }) => (
              <Link key={label} to={to} className={`db-brief-card is-${tone}`}>
                <span className="db-brief-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <small>{label}</small>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
                <FiArrowUpRight className="db-brief-open" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {errorMessage && (
          <div className="db-notification-banner warning">
            <FiAlertTriangle />
            <span>{errorMessage}</span>
          </div>
        )}

        {featuredPaper && (
          <article className="db-featured-spotlight-card">
            <div className="spotlight-badge">
              <FiCheckCircle /> <span>Featured High-Impact Research</span>
            </div>
            <div className="spotlight-body">
              <div className="spotlight-main">
                <h3
                  className="spotlight-title"
                  style={{
                    color: "#ffffff",
                    WebkitTextFillColor: "#ffffff",
                    fontSize: "22px",
                    fontWeight: 900,
                    textShadow: "0 2px 12px rgba(0, 0, 0, 0.8)",
                    margin: "0 0 8px 0"
                  }}
                >
                  <span className="spotlight-title-text">
                    {(featuredPaper.title || "").replace(/<[^>]*>?/gm, "")}
                  </span>
                </h3>
                <p
                  className="spotlight-authors"
                  style={{
                    color: "#e0e7ff",
                    WebkitTextFillColor: "#e0e7ff",
                    fontSize: "14px",
                    fontWeight: 700,
                    margin: 0
                  }}
                >
                  {featuredPaper.authors || "Unknown author"} {featuredPaper.year ? `(${featuredPaper.year})` : ""}
                </p>
              </div>
              <div className="spotlight-metrics">
                <span className="cit-badge"><FiAward /> {formatNumber(featuredPaper.citationCount ?? 0)} Citations</span>
                <Link to="/papers" className="spotlight-btn">
                  Explore Papers <FiArrowUpRight />
                </Link>
              </div>
            </div>
          </article>
        )}

        <div className="db-section-intro">
          <div>
            <span>Index composition</span>
            <h2>The shape of your research catalog</h2>
          </div>
          <p>Four live coverage signals show how much material is ready to explore.</p>
        </div>

        <section className="db-metrics-grid db-metrics-grid-primary" aria-label="Core catalog metrics">
          {primaryStats.map((stat, index) => renderMetricCard(stat, index === 0 ? "featured" : "summary"))}
        </section>

        {supportingStats.length > 0 && (
          <section className="db-impact-strip" aria-labelledby="dashboard-impact-title">
            <div className="db-impact-heading">
              <span><FiTrendingUp aria-hidden="true" /></span>
              <div>
                <small>Research impact</small>
                <h3 id="dashboard-impact-title">Citation and growth signals</h3>
              </div>
            </div>
            <div className="db-metrics-grid db-metrics-grid-secondary">
              {supportingStats.map((stat) => renderMetricCard(stat, "compact"))}
            </div>
          </section>
        )}

        <div className="db-section-intro db-section-intro-compact">
          <div>
            <span>Research signals</span>
            <h2>What deserves attention now</h2>
          </div>
          <p>Publication volume, recurring concepts, and the journals shaping this index.</p>
        </div>

        {/* Middle Charts & Stats Panel */}
        <section className="db-charts-grid">
          
          {/* Card 1: Papers by Year */}
          <article className="chart-card glassmorphic-panel db-v4-activity-card">
            <div className="panel-header-row">
              <h3>Papers by Year</h3>
              <span className="badge-chip">Yearly</span>
            </div>
            
            <div className="bar-chart-container">
              <div className="bar-chart-y-axis">
                {yAxisScale.labels.map((lbl, i) => (
                  <span key={i}>{lbl}</span>
                ))}
              </div>
              <div className="bar-chart-columns">
                {papersByYear.length > 0 ? (
                  papersByYear.map((p, idx) => {
                    const heightPercent = Math.min(100, Math.max(8, (p.value / yAxisScale.maxScale) * 100));
                    return (
                      <Link
                        key={idx}
                        to={`/papers?yearFrom=${p.label}&yearTo=${p.label}`}
                        className="chart-bar-col clickable-bar"
                        title={`Click to view papers from ${p.label}`}
                        style={{ textDecoration: "none" }}
                      >
                        <div className="bar-wrapper">
                          <div 
                            className={`bar-fill bar-fill-gradient-${idx % 7}`} 
                            style={{ height: `${heightPercent}%` }}
                          >
                            <span className="bar-value-label">{formatNumber(p.value)}</span>
                            <span className="bar-tooltip">
                              View {formatNumber(p.value)} papers ({p.label}) →
                            </span>
                          </div>
                        </div>
                        <span className="bar-label">{p.label}</span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="chart-empty-placeholder" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                    No yearly publication data found.
                  </div>
                )}
              </div>
            </div>
            
            <div className="db-v4-activity-footer">
              {activitySummary ? (
                <div className="activity-insights-strip">
                  <div className="insight-stat-item">
                    <span className="insight-label">Peak Year</span>
                    <strong className="insight-val">{activitySummary.peak.label} ({formatNumber(activitySummary.peak.value)})</strong>
                  </div>
                  <div className="insight-stat-item">
                    <span className="insight-label">Total Indexed</span>
                    <strong className="insight-val">{formatNumber(activitySummary.total)} papers</strong>
                  </div>
                  <div className="insight-stat-item">
                    <span className="insight-label">Avg / Year</span>
                    <strong className="insight-val">{formatNumber(activitySummary.avg)} / yr</strong>
                  </div>
                </div>
              ) : (
                <p className="chart-subtext">
                  No publication statistics recorded in the database yet.
                </p>
              )}
            </div>
          </article>

          {/* Card 2: Top Keywords */}
          <article className="chart-card glassmorphic-panel db-v4-keywords-card">
            <div className="panel-header-row">
              <h3>Top Keywords</h3>
              <span className="badge-chip">Top 10</span>
            </div>
            
            <div className="keywords-ranking-list">
              {topKeywords.length > 0 ? (
                topKeywords.slice(0, 7).map((k, idx) => {
                  const widthPercent = (k.value / maxKeywordVal) * 100;
                  return (
                    <div key={idx} className="keyword-row">
                      <span className="keyword-label">{k.label}</span>
                      <div className="keyword-bar-track">
                        <div 
                          className={`keyword-bar-fill fill-color-${idx % 10}`} 
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <span className="keyword-value">{formatNumber(k.value)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="chart-empty-placeholder" style={{ padding: "40px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No keywords indexed.
                </div>
              )}
            </div>
            
            <div className="panel-footer-row">
              <Link to="/keywords" className="footer-link">
                View all keywords <FiArrowRight />
              </Link>
            </div>
          </article>

          {/* Card 3: Top Journals */}
          <article className="chart-card glassmorphic-panel db-v4-journals-card">
            <div className="panel-header-row">
              <h3>Top Journals</h3>
              <span className="badge-chip">Top 5</span>
            </div>

            <div className="donut-chart-wrapper">
              {donutSegments.length > 0 ? (
                <>
                  <div className="donut-svg-box">
                    <svg viewBox="0 0 100 100" className="donut-svg">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="rgba(226, 232, 240, 0.7)" 
                        strokeWidth="8" 
                      />
                      {donutSegments.map((seg, idx) => (
                        <circle
                           key={idx}
                           cx="50"
                           cy="50"
                           r="38"
                           fill="transparent"
                           stroke={seg.color}
                           strokeWidth="8"
                           strokeDasharray={`${seg.strokeLength} 238.76`}
                           strokeDashoffset={seg.strokeOffset}
                           strokeLinecap="round"
                           transform="rotate(-90 50 50)"
                           className="donut-segment"
                        />
                      ))}
                    </svg>
                    <div className="donut-center-text">
                      <strong>{donutSegments[0] ? `${donutSegments[0].percent}%` : "0%"}</strong>
                      <span className="donut-center-badge">Top Share</span>
                    </div>
                  </div>

                  <div className="donut-legend">
                    {donutSegments.map((seg, idx) => (
                      <div key={idx} className="legend-item" style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <span className="legend-dot" style={{ backgroundColor: seg.color, width: "10px", height: "10px", borderRadius: "50%", marginTop: "5px", flexShrink: 0, boxShadow: `0 0 0 3.5px ${seg.color}35` }} />
                        <div className="legend-texts" style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0, flex: 1 }}>
                          <strong className="legend-name" style={{ color: "#0f172a", fontSize: "13px", fontWeight: "780", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seg.label}</strong>
                          <span className="legend-val-badge" style={{ display: "inline-block", color: seg.textColor, backgroundColor: seg.bgColor, border: `1px solid ${seg.color}40`, borderRadius: "6px", padding: "2px 8px", fontSize: "11.5px", fontWeight: "850", width: "fit-content" }}>
                            {formatNumber(seg.value)} ({seg.percent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="chart-empty-placeholder" style={{ padding: "60px 0", width: "100%", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No journals registered in catalog.
                </div>
              )}
            </div>

            <div className="panel-footer-row">
              <Link to="/journals" className="footer-link">
                View all journals <FiArrowRight />
              </Link>
            </div>
          </article>

        </section>

        {/* Bottom row: Cited Papers & Trending Topics */}
        <section className="db-bottom-grid">
          
          {/* Card 1: Top Cited Papers */}
          <article className="table-card glassmorphic-panel db-v4-papers-card">
            <div className="panel-header-row">
              <h3>Top Cited Papers</h3>
              <Link to="/papers" className="footer-link">
                Browse all <FiArrowUpRight />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th style={{ width: "55%" }}>Paper</th>
                    <th style={{ width: "12%" }}>Year</th>
                    <th style={{ width: "18%", textAlign: "right" }}>Citations</th>
                    <th style={{ width: "15%", textAlign: "right" }}>Citations / Yr</th>
                  </tr>
                </thead>
                <tbody>
                  {topCitedPapers.length > 0 ? (
                    topCitedPapers.slice(0, 6).map((paper, idx) => {
                      const cleanTitle = (paper.title || "").replace(/<[^>]*>?/gm, "");
                      return (
                        <tr key={paper.id || idx}>
                          <td>
                            <div className="paper-info-col">
                              <span className={`paper-rank-badge rank-bg-${idx % 3}`}>{idx + 1}</span>
                              <div>
                                <h4 className="paper-title-link" title={cleanTitle}>{cleanTitle}</h4>
                                <p className="paper-authors-sub">{paper.authors}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: "750", color: "#64748b" }}>{paper.year}</td>
                          <td style={{ textAlign: "right" }}>
                            <span className="pub-count-pill" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#1d4ed8" }}>
                              {formatNumber(paper.citationCount)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", color: "#047857", fontWeight: "800", fontSize: "12px" }}>
                            {paper.citationsPerYear > 0 ? `+${formatNumber(paper.citationsPerYear)}/yr` : "—"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "40px 0", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                        No cited papers registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Card 2: Trending Research Topics */}
          <article className="table-card glassmorphic-panel db-v4-topics-card">
            <div className="panel-header-row">
              <h3>Trending Topics</h3>
              <Link to="/topics" className="footer-link">
                Explore all <FiArrowRight />
              </Link>
            </div>

            <div className="trending-topics-mini-list">
              {trendingTopics.length > 0 ? (
                trendingTopics.map((topic, index) => {
                  const hasPapers = Boolean(topic.paperCount && topic.paperCount > 0);
                  const hasFollowers = Boolean(topic.followerCount && topic.followerCount > 0);
                  const badgeText = topic.growth || "Trending";

                  return (
                    <div key={topic.id} className="trending-topic-mini-card">
                      <span className="topic-mini-rank">0{index + 1}</span>
                      <div className="topic-mini-content">
                      <div className="topic-mini-header">
                        <strong>{topic.name}</strong>
                        <span className="topic-badge">{badgeText}</span>
                      </div>
                      {topic.description ? (
                        <p className="topic-mini-desc">{topic.description}</p>
                      ) : null}
                      <div className="topic-mini-stats">
                        {hasPapers && (
                          <span>{formatNumber(topic.paperCount)} papers</span>
                        )}
                        {hasPapers && hasFollowers && (
                          <span className="dot-sep">•</span>
                        )}
                        {hasFollowers && (
                          <span>{formatNumber(topic.followerCount)} followers</span>
                        )}
                        {!hasPapers && !hasFollowers && (
                          <span>Active Topic</span>
                        )}
                      </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="chart-empty-placeholder" style={{ padding: "40px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No trending topics active.
                </div>
              )}
            </div>
          </article>

        </section>

        {canManageSystem && (
          <>
            <div className="db-section-intro db-section-intro-compact">
              <div>
                <span>System operations</span>
                <h2>OpenAlex synchronization health</h2>
              </div>
              <p>Admin-only ingestion totals and the latest synchronization run.</p>
            </div>
            <section className="db-operations-panel db-ops-premium" aria-label="OpenAlex operations">
              <div className="panel-header-row">
                <h3>
                  <FiDatabase className="ops-header-icon" />
                  <span>Operations status</span>
                </h3>
                <span className={`db-operation-status ${String(operationsData?.latestSyncLog?.status || "unknown").toLowerCase()}`}>
                  {String(operationsData?.latestSyncLog?.status || "unknown").toLowerCase() === "failed" ? "⚠ " : ""}
                  {operationsData?.latestSyncLog?.status || "No sync recorded"}
                </span>
              </div>

              {/* Sync health progress bar */}
              {(() => {
                const success = Number(operationsData?.successfulSyncCount ?? 0);
                const failed = Number(operationsData?.failedSyncCount ?? 0);
                const total = success + failed;
                const healthPct = total > 0 ? Math.round((success / total) * 100) : 0;
                return (
                  <div className="ops-health-bar-wrapper">
                    <div className="ops-health-bar-meta">
                      <span>Sync health rate</span>
                      <strong className={healthPct >= 70 ? "health-good" : healthPct >= 40 ? "health-warn" : "health-bad"}>{healthPct}%</strong>
                    </div>
                    <div className="ops-health-bar-track">
                      <div className={`ops-health-bar-fill ${healthPct >= 70 ? "health-good" : healthPct >= 40 ? "health-warn" : "health-bad"}`} style={{ width: `${healthPct}%` }} />
                    </div>
                  </div>
                );
              })()}

              <div className="db-operations-grid">
                <div className="ops-stat-card ops-stat-indigo">
                  <div className="ops-stat-icon"><FiDatabase /></div>
                  <span>OpenAlex records</span>
                  <strong>{formatNumber(operationsData?.openAlexPaperCount ?? 0)}</strong>
                </div>
                <div className="ops-stat-card ops-stat-emerald">
                  <div className="ops-stat-icon"><FiCheckCircle /></div>
                  <span>Successful syncs</span>
                  <strong>{formatNumber(operationsData?.successfulSyncCount ?? 0)}</strong>
                </div>
                <div className="ops-stat-card ops-stat-rose">
                  <div className="ops-stat-icon"><FiAlertTriangle /></div>
                  <span>Failed syncs</span>
                  <strong>{formatNumber(operationsData?.failedSyncCount ?? 0)}</strong>
                </div>
                <div className="ops-stat-card ops-stat-amber">
                  <div className="ops-stat-icon"><FiRefreshCw /></div>
                  <span>Latest sync</span>
                  <strong>
                    {operationsData?.latestSyncLog?.startedAt
                      ? formatDateTime(operationsData.latestSyncLog.startedAt)
                      : "Not available"}
                  </strong>
                  {operationsData?.latestSyncLog?.paperSynced !== undefined && (
                    <small>
                      {formatNumber(operationsData.latestSyncLog.paperSynced)} papers processed
                      {operationsData?.latestSyncLog?.startedAt ? ` • ${formatRelativeTime(operationsData.latestSyncLog.startedAt)}` : ""}
                    </small>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

      </div>
    </MainLayout>
  );
}

export default DashboardPage;
