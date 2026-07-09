import { useCallback, useEffect, useMemo, useState } from "react";
import ChartBox from "../components/ChartBox";
import TopicCard from "../components/TopicCard";
import MainLayout from "../components/layout/MainLayout";
import { getTrendingTopics, getTrendStats } from "../services/trendService";
import { normalizeChartPoint, normalizeTopic, toArray, toObject, unwrapResponse } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/TrendsPage.css";

function normalizeChartData(response) {
  const rawData = unwrapResponse(response);
  const data = toObject(response);
  const chartArray = Array.isArray(rawData)
    ? rawData
    : toArray(data, ["publicationMomentum", "monthlyData", "chartData", "growth", "publicationGrowth"]);
  return chartArray.map(normalizeChartPoint);
}

function TrendsPage() {
  const [range, setRange] = useState("7-months");
  const [monthlyData, setMonthlyData] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const rangeParams = useMemo(() => ({ range }), [range]);

  const loadTrends = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [statsResult, topicsResult] = await Promise.allSettled([
        getTrendStats(rangeParams),
        getTrendingTopics(rangeParams),
      ]);

      setMonthlyData(
        statsResult.status === "fulfilled"
          ? normalizeChartData(statsResult.value)
          : []
      );

      setTopics(
        topicsResult.status === "fulfilled"
          ? toArray(topicsResult.value, ["topics", "trends"]).map(normalizeTopic)
          : []
      );

      // Only show error banner if BOTH fail — individual failures show empty state
      if (statsResult.status === "rejected" && topicsResult.status === "rejected") {
        setErrorMessage("Trend data isn't available right now. The backend may still be setting this up.");
      }
    } catch (error) {
      console.error("Cannot load trends", error);
      setErrorMessage("Something went wrong loading trends. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [rangeParams]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const rangeLabel = range === "12-months" ? "Last 12 months" : "Last 7 months";

  return (
    <MainLayout
      title="Trends"
      subtitle="Monitor growth across scientific topics and publication fields"
    >
      <section className="workspace-page trends-page">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-copy">
            <h2>Research trends</h2>
            <p>
              {loading
                ? "Fetching publication signals…"
                : errorMessage
                  ? "Showing available data — some endpoints are still being set up."
                  : `Showing ${rangeLabel.toLowerCase()}.`}
            </p>
          </div>

          <select
            className="workspace-select"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            disabled={loading}
          >
            <option value="7-months">Last 7 months</option>
            <option value="12-months">Last 12 months</option>
          </select>
        </div>

        {/* Error banner — only when BOTH fail */}
        {!loading && errorMessage && (
          <div className="workspace-notice warning" style={{ marginBottom: 14 }}>
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="workspace-empty">Loading trends…</div>
        ) : (
          <div className="workspace-grid">
            <ChartBox
              title="Publication momentum"
              subtitle="Monthly indexed records"
              rangeLabel={rangeLabel}
              data={monthlyData}
              valueSuffix=""
              emptyMessage="Publication data isn't ready yet — it will appear here once the backend syncs."
            />

            <article className="workspace-panel">
              <div className="workspace-panel-header">
                <h2>Top fields</h2>
                <span>Growth rate</span>
              </div>

              <div className="workspace-list">
                {topics.length > 0 ? (
                  topics.map((topic, index) => (
                    <TopicCard key={topic.id} rank={index + 1} {...topic} />
                  ))
                ) : (
                  <div className="workspace-empty">
                    No trending topics yet. This updates as research data syncs in.
                  </div>
                )}
              </div>
            </article>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default TrendsPage;
