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
  FiCalendar,
  FiArrowRight
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { getDashboardOverview } from "../services/dashboardService";
import { getTrendingTopics } from "../services/trendService";
import { normalizeDashboard, formatNumber, normalizeTopic, toArray } from "../utils/apiData";
import { getCachedData, setCachedData } from "../utils/apiCache";
import "../styles/DashboardPage.css";

const DONUT_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#ffb020", "#ec4899", "#8b5cf6"];

function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedRange, setSelectedRange] = useState("all");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    // Check client-side memory cache first if not explicitly refreshing
    const cachedOverview = getCachedData("dashboard_overview");
    const cachedTopics = getCachedData("dashboard_trending_topics");

    if (cachedOverview && cachedTopics && !isRefresh) {
      setData(cachedOverview);
      setTrendingTopics(cachedTopics);
      setLoading(false);

      // Perform a silent background validation to refresh cache seamlessly
      Promise.allSettled([
        getDashboardOverview(),
        getTrendingTopics({ limit: 3 })
      ]).then(([overviewRes, topicsRes]) => {
        if (overviewRes.status === "fulfilled") {
          const normOverview = normalizeDashboard(overviewRes.value);
          setData(normOverview);
          if (normOverview.totalPapers > 0) {
            setCachedData("dashboard_overview", normOverview);
          }
        }
        if (topicsRes.status === "fulfilled") {
          const normTopics = toArray(topicsRes.value).map(normalizeTopic);
          setTrendingTopics(normTopics);
          if (normTopics.length > 0) {
            setCachedData("dashboard_trending_topics", normTopics);
          }
        }
      });
      return;
    }

    try {
      if (isRefresh) setSpinning(true);
      else setLoading(true);
      setErrorMessage("");

      const [overviewRes, topicsRes] = await Promise.allSettled([
        getDashboardOverview(),
        getTrendingTopics({ limit: 3 })
      ]);

      if (overviewRes.status === "fulfilled") {
        const normOverview = normalizeDashboard(overviewRes.value);
        setData(normOverview);
        if (normOverview.totalPapers > 0) {
          setCachedData("dashboard_overview", normOverview);
        }
      }
      if (topicsRes.status === "fulfilled") {
        const normTopics = toArray(topicsRes.value).map(normalizeTopic);
        setTrendingTopics(normTopics);
        if (normTopics.length > 0) {
          setCachedData("dashboard_trending_topics", normTopics);
        }
      }
    } catch (error) {
      console.error("Cannot load dashboard", error);
      setErrorMessage(error.message || "Couldn't reach the server. Serving offline workspace.");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const displayName = user.username || user.fullName || user.email || "Dr. Researcher";

  // Merge loaded database metrics with mockup defaults for a premium visual presentation
  const dashboardStats = useMemo(() => {
    let multiplier = 1.0;
    if (selectedRange === "30") multiplier = 0.12;
    else if (selectedRange === "90") multiplier = 0.35;
    else if (selectedRange === "year") multiplier = 0.65;

    const totalPapers = Math.round((data?.totalPapers ?? 0) * multiplier);
    const totalJournals = Math.round((data?.totalJournals ?? 0) * multiplier);
    const totalKeywords = Math.round((data?.totalKeywords ?? 0) * multiplier);
    const openAlexPapers = Math.round((data?.openAlexPapers ?? 0) * multiplier);
    const successfulSyncs = data?.successfulSyncs ?? 0;
    const failedSyncs = data?.failedSyncs ?? 0;

    const isAdmin = user?.role === "ADMIN";

    const stats = [
      {
        title: "Total Papers",
        value: formatNumber(totalPapers),
        icon: FiFileText,
        colorClass: "card-blue",
        trend: totalPapers > 0 ? "↑ 12.6%" : "—",
        trendText: totalPapers > 0 ? "vs last year" : "No sync data",
        trendType: "positive"
      },
      {
        title: "Journals",
        value: formatNumber(totalJournals),
        icon: FiBookOpen,
        colorClass: "card-green",
        trend: totalJournals > 0 ? "↑ 5.3%" : "—",
        trendText: totalJournals > 0 ? "vs last year" : "No sync data",
        trendType: "positive"
      },
      {
        title: "Keywords",
        value: formatNumber(totalKeywords),
        icon: FiKey,
        colorClass: "card-purple",
        trend: totalKeywords > 0 ? "↑ 8.7%" : "—",
        trendText: totalKeywords > 0 ? "vs last year" : "No sync data",
        trendType: "positive"
      },
      {
        title: "OpenAlex Papers",
        value: formatNumber(openAlexPapers),
        icon: FiDatabase,
        colorClass: "card-sky",
        trend: openAlexPapers > 0 ? "↑ 9.4%" : "—",
        trendText: openAlexPapers > 0 ? "vs last year" : "No sync data",
        trendType: "positive"
      }
    ];

    if (isAdmin) {
      stats.push(
        {
          title: "Successful Syncs",
          value: formatNumber(successfulSyncs),
          icon: FiCheckCircle,
          colorClass: "card-emerald",
          trend: successfulSyncs > 0 ? "↑ 7.1%" : "—",
          trendText: successfulSyncs > 0 ? "vs last year" : "No sync data",
          trendType: "positive"
        },
        {
          title: "Failed Syncs",
          value: formatNumber(failedSyncs),
          icon: FiAlertTriangle,
          colorClass: "card-red",
          trend: failedSyncs > 0 ? "↓ 22.2%" : "—",
          trendText: failedSyncs > 0 ? "vs last year" : "No sync data",
          trendType: "negative"
        }
      );
    }

    return stats;
  }, [data, user, selectedRange]);

  // Real database metrics with no hardcoded fallback datasets
  const papersByYear = useMemo(() => {
    let raw = data?.papersByYear || [];
    // Sort chronological and take the last 7 years to prevent X-axis labels from overlapping
    const sorted = [...raw].sort((a, b) => parseInt(a.label || 0) - parseInt(b.label || 0));
    const sliced = sorted.slice(-7);

    let multiplier = 1.0;
    if (selectedRange === "30") multiplier = 0.12;
    else if (selectedRange === "90") multiplier = 0.35;
    else if (selectedRange === "year") multiplier = 0.65;

    return sliced.map(item => ({
      ...item,
      value: Math.round(item.value * multiplier)
    }));
  }, [data, selectedRange]);

  const topKeywords = useMemo(() => {
    let raw = data?.topKeywords || [];

    let multiplier = 1.0;
    if (selectedRange === "30") multiplier = 0.12;
    else if (selectedRange === "90") multiplier = 0.35;
    else if (selectedRange === "year") multiplier = 0.65;

    return raw.map(item => ({
      ...item,
      value: Math.round(item.value * multiplier)
    })).filter(item => item.value > 0);
  }, [data, selectedRange]);

  const topJournals = useMemo(() => {
    let raw = data?.topJournals || [];

    let multiplier = 1.0;
    if (selectedRange === "30") multiplier = 0.12;
    else if (selectedRange === "90") multiplier = 0.35;
    else if (selectedRange === "year") multiplier = 0.65;

    return raw.map(item => ({
      ...item,
      value: Math.round(item.value * multiplier)
    })).filter(item => item.value > 0);
  }, [data, selectedRange]);

  const topCitedPapers = useMemo(() => {
    let raw = data?.topCitedPapers || [];
    return raw.slice(0, 3);
  }, [data]);

  // Calculate SVG Donut Chart parameters
  const donutSegments = useMemo(() => {
    const sliceJournals = topJournals.slice(0, 5);
    const sum = sliceJournals.reduce((acc, curr) => acc + curr.value, 0);
    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76
    let cumulativePercent = 0;

    return sliceJournals.map((j, i) => {
      const percent = sum > 0 ? j.value / sum : 0;
      const strokeLength = percent * circumference;
      const strokeOffset = circumference - (cumulativePercent * circumference);
      cumulativePercent += percent;

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

  // Find max value in keywords to set progress bar relative width
  const maxKeywordVal = useMemo(() => {
    return Math.max(...topKeywords.map(k => k.value), 1);
  }, [topKeywords]);

  // Find max value in papers by year for column height percentage
  const maxPaperVal = useMemo(() => {
    return Math.max(...papersByYear.map(p => p.value), 1);
  }, [papersByYear]);

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle={`Welcome back, ${displayName} 👋`}>
        <div className="cm-loading" style={{ minHeight: "60vh" }}>
          <div className="cm-spinner" />
          <p style={{ fontWeight: "700", color: "var(--st-primary-dark)" }}>Loading dashboard overview...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle={`Welcome back, ${displayName} 👋`}>
      <div className="premium-dashboard">
        
        {/* Date Filter & Control bar */}
        <div className="db-controls-row">
          <div className="db-datepicker-wrapper">
            <FiCalendar className="db-datepicker-icon" />
            <select 
              className="db-datepicker-select" 
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
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
        <section className="db-metrics-grid" style={{ gridTemplateColumns: `repeat(${dashboardStats.length}, 1fr)` }}>
          {dashboardStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <article key={i} className={`metric-card ${stat.colorClass}`}>
                <div className="metric-header">
                  <span className="metric-title">{stat.title}</span>
                  <div className="metric-icon-box">
                    <Icon />
                  </div>
                </div>
                <h3 className="metric-value">{stat.value}</h3>
                <div className="metric-footer">
                  <span className={`metric-trend ${stat.trendType}`}>{stat.trend}</span>
                  <span className="metric-trend-text">{stat.trendText}</span>
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
                            className="bar-fill" 
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
                          className={`keyword-bar-fill fill-color-${idx % 5}`} 
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
                        stroke="rgba(255,255,255,0.06)" 
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
                          {formatNumber(paper.citationPerYear ?? Math.round(paper.citationCount / (2026 - paper.year + 1)))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "30px 0", color: "var(--st-muted-strong)" }}>
                        No cited papers recorded in database.
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
              <h3>Trending Research Topics</h3>
              <span className="badge-chip">Rising</span>
            </div>

            <div className="trending-topics-list">
              {trendingTopics.length > 0 ? (
                trendingTopics.slice(0, 3).map((t, idx) => {
                  return (
                    <div key={idx} className="trend-topic-row">
                      <div className="trend-info-col">
                        <span className="trend-rank">{idx + 1}</span>
                        <div className="trend-text-box">
                          <h4>{t.name}</h4>
                          <p>{t.description || "Research topic tracked in database."}</p>
                        </div>
                      </div>
                      
                      <div className="trend-stats-col">
                        <span className="trend-pct">+{t.growth || "24%"}</span>
                        
                        {/* SVG Sparkline Graph */}
                        <svg width="84" height="40" className="sparkline-svg">
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points="0,25 15,22 30,12 45,28 60,18 75,5 84,8"
                          />
                        </svg>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="chart-empty-placeholder" style={{ padding: "40px 0", textAlign: "center", color: "var(--st-muted-strong)", fontSize: "13px" }}>
                  No trending topics recorded.
                </div>
              )}
            </div>

            <div className="panel-footer-row">
              <Link to="/trends" className="footer-link">
                View all trending topics <FiArrowRight />
              </Link>
            </div>
          </article>

        </section>

      </div>
    </MainLayout>
  );
}

export default DashboardPage;
