import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiFileText, FiBookOpen, FiKey, FiDatabase, FiArrowUpRight } from "react-icons/fi";
import ChartBox from "../components/ChartBox";
import StatCard from "../components/StatCard";
import PaperCard from "../components/PaperCard";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { getDashboardOverview } from "../services/dashboardService";
import { normalizeDashboard, formatNumber } from "../utils/apiData";
import { formatRoleForDisplay } from "../utils/authStorage";
import "../styles/DashboardPage.css";

function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setSpinning(true);
      else setLoading(true);
      setErrorMessage("");

      const response = await getDashboardOverview();
      setData(normalizeDashboard(response));
    } catch (error) {
      console.error("Cannot load dashboard", error);
      setErrorMessage(error.message || "Couldn't reach the server. Try refreshing in a moment.");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const displayName = user.username || user.email || "Researcher";

  const statCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: "Papers indexed",
        value: formatNumber(data.totalPapers),
        icon: FiFileText,
        trend: "positive",
        description: `${formatNumber(data.openAlexPapers)} pulled from OpenAlex`,
      },
      {
        title: "Journals tracked",
        value: formatNumber(data.totalJournals),
        icon: FiBookOpen,
        trend: "positive",
      },
      {
        title: "Keywords catalogued",
        value: formatNumber(data.totalKeywords),
        icon: FiKey,
        trend: "positive",
      },
      {
        title: "Sync health",
        value: `${formatNumber(data.successfulSyncs)} / ${formatNumber(data.successfulSyncs + data.failedSyncs)}`,
        icon: FiDatabase,
        trend: data.failedSyncs > 0 ? "negative" : "positive",
        description: data.failedSyncs > 0
          ? `${data.failedSyncs} sync${data.failedSyncs > 1 ? "s" : ""} need attention`
          : "Everything synced cleanly",
      },
    ];
  }, [data]);

  if (loading) {
    return (
      <MainLayout title="Dashboard" subtitle="ScienceTrend Hub workspace">
        <div className="cm-loading" style={{ minHeight: 320, fontSize: 14 }}>
          Loading your workspace…
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle="ScienceTrend Hub workspace">
      <div className="db-page">
        {/* Welcome */}
        <div className="db-welcome-row">
          <div>
            <span className="db-eyebrow">Overview</span>
            <h2>Good to see you, {displayName}</h2>
            <p>
              {formatRoleForDisplay(user.role)} — here's what's happening across your research workspace.
            </p>
          </div>
          <button
            type="button"
            className="db-refresh-btn"
            onClick={() => loadDashboard(true)}
            disabled={spinning}
          >
            <FiRefreshCw className={spinning ? "is-spinning" : ""} />
            {spinning ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {errorMessage && (
          <div className="db-error-banner">
            {errorMessage}
          </div>
        )}

        {/* Stat Cards */}
        <div className="db-stats-grid">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        {/* Charts row */}
        {data && (
          <div className="db-primary-grid">
            <ChartBox
              title="Papers by year"
              subtitle="Publication activity"
              data={data.papersByYear}
              rangeLabel="All time"
              emptyMessage="No publication data yet — check back once a sync completes."
            />

            <ChartBox
              title="Top keywords"
              subtitle="Trending terms"
              data={data.topKeywords}
              emptyMessage="No keyword data yet. Run a sync to populate this."
            />
          </div>
        )}

        {/* Top Cited Papers */}
        {data && data.topCitedPapers.length > 0 && (
          <div className="db-panel db-chart-panel" style={{ marginBottom: 20 }}>
            <div className="db-panel-header">
              <div>
                <span className="db-eyebrow">Most referenced</span>
                <h2>Top cited papers</h2>
              </div>
              <Link to="/papers" className="db-panel-header-link">
                Browse all <FiArrowUpRight />
              </Link>
            </div>
            <div className="db-paper-list">
              {data.topCitedPapers.slice(0, 5).map((paper) => (
                <PaperCard key={paper.id} {...paper} />
              ))}
            </div>
          </div>
        )}

        {/* Top Journals chart */}
        {data && data.topJournals.length > 0 && (
          <ChartBox
            title="Top journals"
            subtitle="By paper count"
            data={data.topJournals}
            emptyMessage="No journal data available yet."
          />
        )}
      </div>
    </MainLayout>
  );
}

export default DashboardPage;
