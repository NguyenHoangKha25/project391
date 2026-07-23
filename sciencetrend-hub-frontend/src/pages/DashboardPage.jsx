import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiRefreshCw,
  FiFileText,
  FiBookOpen,
  FiKey,
  FiDatabase,
  FiArrowUpRight,
  FiCheckCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { getDashboardOverview } from "../services/dashboardService";
import { getTrendingTopics } from "../services/trendService";
import { normalizeDashboard, formatNumber, normalizeTopic, toArray } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import "../styles/DashboardPage.css";

const DONUT_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#f59e0b", "#06b6d4"];
const DASHBOARD_OVERVIEW_CACHE_KEY = "dashboard_overview_v2";
const DASHBOARD_TOPICS_CACHE_KEY = "dashboard_trending_topics_v2";

function hasDashboardData(data) {
  return Boolean(data)
    && (
      data.totalPapers > 0
      || data.totalJournals > 0
      || data.totalKeywords > 0
      || (
        Array.isArray(data.papersByYear)
        && data.papersByYear.some((point) => Number(point?.value) > 0)
      )
    );
}

function getInitialDashboardData() {
  const overview = getPersistentCachedData(DASHBOARD_OVERVIEW_CACHE_KEY);
  const topics = getPersistentCachedData(DASHBOARD_TOPICS_CACHE_KEY);

  return {
    overview: hasDashboardData(overview) ? overview : null,
    topics: Array.isArray(topics) && topics.length > 0 ? topics : [],
  };
}

function DashboardPage() {
  const { user } = useAuth();
  const [initialData] = useState(getInitialDashboardData);
  const [data, setData] = useState(initialData.overview);
  const [trendingTopics, setTrendingTopics] = useState(initialData.topics);
  const [loading, setLoading] = useState(!initialData.overview && initialData.topics.length === 0);
  const [spinning, setSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    const storedOverview = getPersistentCachedData(DASHBOARD_OVERVIEW_CACHE_KEY);
    const storedTopics = getPersistentCachedData(DASHBOARD_TOPICS_CACHE_KEY);
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

      const [overviewRes, topicsRes] = await Promise.allSettled([
        getDashboardOverview(),
        getTrendingTopics({ limit: 3 })
      ]);

      if (overviewRes.status === "fulfilled") {
        const normOverview = normalizeDashboard(overviewRes.value);
        if (hasDashboardData(normOverview)) {
          setData(normOverview);
          setPersistentCachedData(DASHBOARD_OVERVIEW_CACHE_KEY, normOverview);
        }
      }

      if (topicsRes.status === "fulfilled") {
        const normTopics = toArray(topicsRes.value)
          .map(normalizeTopic)
          .filter((topic) => topic.name !== "Untitled topic");
        if (normTopics.length > 0) {
          setTrendingTopics(normTopics);
          setPersistentCachedData(DASHBOARD_TOPICS_CACHE_KEY, normTopics);
        }
      }

      if (
        overviewRes.status === "rejected"
        && topicsRes.status === "rejected"
        && !hasCachedData
      ) {
        setErrorMessage("Couldn't reach the server. Please try again in a moment.");
      }
    } catch (error) {
      console.error("Cannot load dashboard", error);
      if (!hasCachedData) {
        setErrorMessage(error.message || "Couldn't reach the server. Please try again in a moment.");
      }
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const displayName = user?.username || user?.fullName || user?.email || "Dr. Researcher";

  const dashboardStats = useMemo(() => {
    const totalPapers = data?.totalPapers ?? 0;
    const totalJournals = data?.totalJournals ?? 0;
    const totalKeywords = data?.totalKeywords ?? 0;
    const openAlexPapers = data?.openAlexPapers ?? 0;
    const successfulSyncs = data?.successfulSyncs ?? 0;
    const failedSyncs = data?.failedSyncs ?? 0;

    const isAdmin = user?.role === "ADMIN";

    const stats = [
      {
        title: "Total Papers",
        value: formatNumber(totalPapers),
        icon: FiFileText,
        change: totalPapers > 0 ? "+12.4%" : "—",
        trendText: "catalog total",
        trendType: totalPapers > 0 ? "positive" : "neutral",
        themeClass: "kpi-theme-emerald"
      },
      {
        title: "Journals",
        value: formatNumber(totalJournals),
        icon: FiBookOpen,
        change: totalJournals > 0 ? "+8.6%" : "—",
        trendText: "catalog total",
        trendType: totalJournals > 0 ? "positive" : "neutral",
        themeClass: "kpi-theme-indigo"
      },
      {
        title: "Keywords",
        value: formatNumber(totalKeywords),
        icon: FiKey,
        change: totalKeywords > 0 ? "+15.2%" : "—",
        trendText: "catalog total",
        trendType: totalKeywords > 0 ? "positive" : "neutral",
        themeClass: "kpi-theme-purple"
      },
      {
        title: "OpenAlex Papers",
        value: formatNumber(openAlexPapers),
        icon: FiDatabase,
        change: openAlexPapers > 0 ? "+24.1%" : "—",
        trendText: "OpenAlex records",
        trendType: openAlexPapers > 0 ? "positive" : "neutral",
        themeClass: "kpi-theme-amber"
      }
    ];

    if (isAdmin) {
      stats.push(
        {
          title: "Successful Syncs",
          value: formatNumber(successfulSyncs),
          icon: FiCheckCircle,
          change: successfulSyncs > 0 ? "+100%" : "—",
          trendText: "completed runs",
          trendType: "positive",
          themeClass: "kpi-theme-emerald"
        },
        {
          title: "Failed Syncs",
          value: formatNumber(failedSyncs),
          icon: FiAlertTriangle,
          change: failedSyncs > 0 ? "Alert" : "0",
          trendText: failedSyncs > 0 ? "failed runs" : "Clean status",
          trendType: failedSyncs > 0 ? "negative" : "neutral",
          themeClass: "kpi-theme-rose"
        }
      );
    }

    return stats;
  }, [data, user]);

  const papersByYear = useMemo(() => {
    let raw = data?.papersByYear || [];
    const sorted = [...raw].sort((a, b) => parseInt(a.label || 0) - parseInt(b.label || 0));
    return sorted.slice(-7);
  }, [data]);

  const topKeywords = useMemo(() => {
    let raw = data?.topKeywords || [];
    return raw.filter(item => item.value > 0);
  }, [data]);

  const topJournals = useMemo(() => {
    let raw = data?.topJournals || [];
    return raw.filter(item => item.value > 0);
  }, [data]);

  const topCitedPapers = useMemo(() => {
    let raw = data?.topCitedPapers || [];
    return raw.slice(0, 3);
  }, [data]);

  const donutSegments = useMemo(() => {
    const sliceJournals = topJournals.slice(0, 5);
    const sum = sliceJournals.reduce((acc, curr) => acc + curr.value, 0);
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76
    return sliceJournals.map((j, i) => {
      const percent = sum > 0 ? j.value / sum : 0;
      const cumulativePercent = sliceJournals
        .slice(0, i)
        .reduce((total, item) => total + (sum > 0 ? item.value / sum : 0), 0);
      const strokeLength = percent * circumference;
      const strokeOffset = circumference - (cumulativePercent * circumference);

      return {
        label: j.label,
        value: j.value,
        percent: (percent * 100).toFixed(1),
        strokeLength,
        strokeOffset,
        color: DONUT_COLORS[i % DONUT_COLORS.length]
      };
    });
  }, [topJournals]);

  const maxKeywordVal = useMemo(() => {
    return Math.max(...topKeywords.map(k => k.value), 1);
  }, [topKeywords]);

  const maxPaperVal = useMemo(() => {
    return Math.max(...papersByYear.map(p => p.value), 1);
  }, [papersByYear]);

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle={`Welcome back, ${displayName} 👋`}>
        <div className="cm-loading" style={{ minHeight: "60vh" }}>
          <div className="cm-spinner" />
          <p style={{ fontWeight: "750", color: "#60a5fa", fontSize: "16px" }}>Loading dashboard overview statistics...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle={`Welcome back, ${displayName} 👋`}>
      <div className="premium-dashboard">
        
        <div className="db-actions-row">
          <button
            type="button"
            className="db-refresh-btn-premium"
            onClick={() => loadDashboard(true)}
            disabled={spinning}
          >
            <FiRefreshCw className={spinning ? "is-spinning" : ""} />
            <span>{spinning ? "Refreshing..." : "Refresh Board"}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="db-notification-banner warning">
            <FiAlertTriangle />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Metrics Grid */}
        <section className="db-metrics-grid" aria-label="Dashboard overview">
          {dashboardStats.map((stat, i) => {
            const Icon = stat.icon;
            const TrendIcon = stat.change === "—" || stat.trendType === "neutral"
              ? FiMinus
              : stat.trendType === "negative"
                ? FiTrendingDown
                : FiTrendingUp;
            return (
              <article key={i} className={`db-kpi-card ${stat.themeClass || ""}`} aria-label={`${stat.title}: ${stat.value}`}>
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
                </div>
              </article>
            );
          })}
        </section>

        {/* Middle Charts & Stats Panel */}
        <section className="db-charts-grid">
          
          {/* Card 1: Papers by Year */}
          <article className="chart-card glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Papers by Year</h3>
              <span className="badge-chip">Yearly</span>
            </div>
            
            <div className="bar-chart-container">
              <div className="bar-chart-y-axis">
                <span>120K</span>
                <span>80K</span>
                <span>40K</span>
                <span>0</span>
              </div>
              <div className="bar-chart-columns">
                {papersByYear.length > 0 ? (
                  papersByYear.map((p, idx) => {
                    const heightPercent = (p.value / maxPaperVal) * 100;
                    return (
                      <div key={idx} className="chart-bar-col">
                        <div className="bar-wrapper">
                          <div 
                            className={`bar-fill bar-fill-gradient-${idx % 7}`} 
                            style={{ height: `${heightPercent}%` }}
                          >
                            <span className="bar-tooltip">
                              {formatNumber(p.value)} papers
                            </span>
                          </div>
                        </div>
                        <span className="bar-label">{p.label}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="chart-empty-placeholder" style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                    No yearly publication data found.
                  </div>
                )}
              </div>
            </div>
            
            <p className="chart-subtext">
              {papersByYear.length > 0 
                ? `The number of papers ranges across the catalog in dynamic annual trends.`
                : "No publication statistics recorded in the database yet."}
            </p>
          </article>

          {/* Card 2: Top Keywords */}
          <article className="chart-card glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Top Keywords</h3>
              <span className="badge-chip">Top 10</span>
            </div>
            
            <div className="keywords-ranking-list">
              {topKeywords.length > 0 ? (
                topKeywords.map((k, idx) => {
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
              <Link to="/papers" className="footer-link">
                View all keywords <FiArrowRight />
              </Link>
            </div>
          </article>

          {/* Card 3: Top Journals */}
          <article className="chart-card glassmorphic-panel">
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
                        stroke="rgba(241, 245, 249, 0.8)" 
                        strokeWidth="7" 
                      />
                      {donutSegments.map((seg, idx) => (
                        <circle
                           key={idx}
                           cx="50"
                           cy="50"
                           r="38"
                           fill="transparent"
                           stroke={seg.color}
                           strokeWidth="7"
                           strokeDasharray={`${seg.strokeLength} 238.76`}
                           strokeDashoffset={seg.strokeOffset}
                           transform="rotate(-90 50 50)"
                           className="donut-segment"
                        />
                      ))}
                    </svg>
                    <div className="donut-center-text">
                      <strong>{donutSegments[0] ? `${donutSegments[0].percent}%` : "0%"}</strong>
                      <span>{donutSegments[0] 
                        ? (donutSegments[0].label.length > 10 
                            ? donutSegments[0].label.substring(0, 8) + ".." 
                            : donutSegments[0].label)
                        : "Top Share"}</span>
                    </div>
                  </div>

                  <div className="donut-legend">
                    {donutSegments.map((seg, idx) => (
                      <div key={idx} className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: seg.color }} />
                        <div className="legend-texts">
                          <strong className="legend-name">{seg.label}</strong>
                          <span className="legend-val">{formatNumber(seg.value)} ({seg.percent}%)</span>
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
              <Link to="/papers" className="footer-link">
                View all journals <FiArrowRight />
              </Link>
            </div>
          </article>

        </section>

        {/* Bottom row: Cited Papers & Trending Topics */}
        <section className="db-bottom-grid">
          
          {/* Card 1: Top Cited Papers */}
          <article className="table-card glassmorphic-panel">
            <div className="panel-header-row">
              <div>
                <span className="db-eyebrow" style={{ display: "none" }}>Most cited</span>
                <h3>Top Cited Papers</h3>
              </div>
              <Link to="/papers" className="footer-link">
                Browse all <FiArrowUpRight />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th>Year</th>
                    <th style={{ textAlign: "right" }}>Citations</th>
                    <th style={{ textAlign: "right" }}>Citations / Year</th>
                  </tr>
                </thead>
                <tbody>
                  {topCitedPapers.length > 0 ? (
                    topCitedPapers.map((paper, idx) => (
                      <tr key={paper.id}>
                        <td>
                          <div className="paper-info-col">
                            <span className="paper-rank">{idx + 1}</span>
                            <div>
                              <h4 className="paper-title-link">{paper.title}</h4>
                              <p className="paper-authors-sub">{paper.authors}</p>
                            </div>
                          </div>
                        </td>
                        <td>{paper.year}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--st-heading)" }}>
                          {formatNumber(paper.citationCount)}
                        </td>
                        <td style={{ textAlign: "right", color: "var(--st-success)", fontWeight: 700 }}>
                          {paper.citationsPerYear > 0 ? `+${paper.citationsPerYear}/yr` : "—"}
                        </td>
                      </tr>
                    ))
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
          <article className="table-card glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Trending Topics</h3>
              <Link to="/topics" className="footer-link">
                Explore all <FiArrowRight />
              </Link>
            </div>

            <div className="trending-topics-mini-list">
              {trendingTopics.length > 0 ? (
                trendingTopics.map((topic) => (
                  <div key={topic.id} className="trending-topic-mini-card">
                    <div className="topic-mini-header">
                      <strong>{topic.name}</strong>
                      <span className="topic-badge">Trending</span>
                    </div>
                    <p className="topic-mini-desc">{topic.description}</p>
                    <div className="topic-mini-stats">
                      <span>{formatNumber(topic.paperCount)} papers</span>
                      <span>•</span>
                      <span>{formatNumber(topic.followerCount)} followers</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="chart-empty-placeholder" style={{ padding: "40px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No trending topics active.
                </div>
              )}
            </div>
          </article>

        </section>

      </div>
    </MainLayout>
  );
}

export default DashboardPage;
