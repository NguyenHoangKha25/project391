import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiTrendingUp,
  FiSearch,
  FiX,
  FiPlus,
  FiCalendar,
  FiGrid,
  FiArrowUpRight,
  FiInfo,
  FiLayers,
  FiChevronDown,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { getTrendingTopics, getTrendStats } from "../services/trendService";
import { getAllTopics } from "../services/topicService";
import { normalizeChartPoint, normalizeTopic, toArray, formatNumber } from "../utils/apiData";
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
  const [yearFilter, setYearFilter] = useState("2015-2025");
  
  // Keyword chips state
  const [keywordChips, setKeywordChips] = useState([
    "Large Language Models",
    "Diffusion Models",
    "Graph Neural Networks",
    "AI for Healthcare",
    "Vision-Language Models",
  ]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [showAddKeywordInput, setShowAddKeywordInput] = useState(false);

  // Data states from backend
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [dbKeywords, setDbKeywords] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  const loadTrendData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [topicsRes, statsRes, allTopicsRes] = await Promise.allSettled([
        getTrendingTopics({ limit: 10 }),
        getTrendStats({ keyword: keywordChips[0] || "computer science" }),
        getAllTopics(),
      ]);

      setTrendingTopics(
        topicsRes.status === "fulfilled"
          ? toArray(topicsRes.value).map(normalizeTopic)
          : []
      );
      setChartData(
        statsRes.status === "fulfilled"
          ? toArray(statsRes.value).map(normalizeChartPoint)
          : []
      );
      setDbKeywords(
        allTopicsRes.status === "fulfilled"
          ? toArray(allTopicsRes.value).map((t, idx) => t.name ?? `Topic ${idx}`)
          : []
      );
    } catch (err) {
      console.error("Cannot load trends data", err);
      setErrorMessage("Could not load scientific trend signals. Using cached dataset.");
    } finally {
      setLoading(false);
    }
  }, [keywordChips]);

  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);

  // Chip management
  function handleAddChip(e) {
    e.preventDefault();
    const val = newKeywordInput.trim();
    if (val && !keywordChips.includes(val)) {
      setKeywordChips((curr) => [...curr, val]);
      setNewKeywordInput("");
      setShowAddKeywordInput(false);
      showToast(`Added keyword trace: "${val}"`, "success");
    }
  }

  function handleRemoveChip(chipToRemove) {
    setKeywordChips((curr) => curr.filter((c) => c !== chipToRemove));
    showToast(`Removed keyword trace: "${chipToRemove}"`, "info");
  }

  function handleClearAllChips() {
    setKeywordChips([]);
    showToast("Cleared keyword traces.", "info");
  }

  // Calculate dynamic SVG Area Chart path (Publication Count by Year)
  const areaChartPathData = useMemo(() => {
    // Fallback coordinates if backend is empty
    const points = chartData.length > 0 
      ? chartData.map((pt) => pt.value)
      : [24100, 27800, 31500, 38400, 48200, 59700, 72600, 86400, 102100, 120400, 128600];
    
    const width = 380;
    const height = 120;
    const padding = 10;
    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, 0);
    const range = maxVal - minVal;
    
    const coords = points.map((val, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (points.length - 1);
      const y = height - padding - ((val - minVal) * (height - 2 * padding)) / range;
      return { x, y };
    });

    const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    
    // Closed shape for gradient area filling
    const areaPath = coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(height - padding).toFixed(1)} L ${coords[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`
      : "";

    return { linePath, areaPath, coords, points };
  }, [chartData]);

  // Mock compared data for Multiple Lines Comparison chart (Keyword/Topic Comparison)
  const comparisonLines = useMemo(() => {
    const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const width = 380;
    const height = 120;
    const padding = 10;

    // Define curves for compared keywords
    const dataset = [
      { label: "LLMs", stroke: "#2563eb", values: [10, 14, 18, 22, 30, 42, 58, 72, 85, 92, 98] },
      { label: "Diffusion", stroke: "#10b981", values: [5, 8, 12, 16, 22, 29, 39, 52, 65, 78, 83] },
      { label: "GNNs", stroke: "#8b5cf6", values: [15, 19, 22, 25, 29, 33, 38, 44, 51, 58, 62] },
      { label: "AI Health", stroke: "#ffb020", values: [8, 11, 14, 16, 20, 24, 29, 35, 41, 46, 51] },
      { label: "VLM", stroke: "#0ea5e9", values: [2, 3, 5, 8, 12, 18, 26, 38, 54, 72, 81] }
    ];

    return dataset.slice(0, Math.max(1, keywordChips.length)).map((line, lineIdx) => {
      const maxVal = 100;
      const minVal = 0;
      const range = 100;

      const coords = line.values.map((val, idx) => {
        const x = padding + (idx * (width - 2 * padding)) / (years.length - 1);
        const y = height - padding - ((val - minVal) * (height - 2 * padding)) / range;
        return { x, y };
      });

      const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

      return {
        label: keywordChips[lineIdx] || line.label,
        stroke: line.stroke,
        linePath,
        coords
      };
    });
  }, [keywordChips]);

  // Generate dynamic sparkline coordinates
  function getSparklinePoints(growth, idx) {
    const seed = parseFloat(growth) || 15;
    const base = [10, 15, 12, 20, 18, 28, 24, 35];
    return base.map((b, i) => `${i * 12},${40 - (b + idx * 2 + seed * 0.1)}`).join(" ");
  }

  return (
    <MainLayout title="Trends & Topics" subtitle="Discover emerging research trends and topic evolution">
      <div className="trends-page-container">
        
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
                placeholder="Search keywords or topics..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>

            <div className="trends-select-wrapper-custom">
              <select>
                <option value="all">All Fields</option>
                <option value="cs">Computer Science</option>
                <option value="med">Medicine</option>
              </select>
              <FiChevronDown />
            </div>

            <div className="trends-select-wrapper-custom">
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                <option value="2015-2025">2015 - 2025</option>
                <option value="2020-2025">2020 - 2025</option>
                <option value="2010-2020">2010 - 2020</option>
              </select>
              <FiCalendar />
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

        {/* Dynamic active keyword chips */}
        <div className="trends-keyword-chips-row">
          {keywordChips.map((chip, idx) => (
            <span key={idx} className={`trends-keyword-chip chip-color-${idx % 5}`}>
              <span className="dot" />
              <span className="label-text">{chip}</span>
              <button type="button" onClick={() => handleRemoveChip(chip)}>
                <FiX />
              </button>
            </span>
          ))}

          {showAddKeywordInput ? (
            <form onSubmit={handleAddChip} className="trends-add-chip-form">
              <input
                type="text"
                autoFocus
                placeholder="Type keyword..."
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
              <span>Add keyword</span>
            </button>
          )}

          {keywordChips.length > 0 && (
            <button type="button" className="trends-clear-chips-btn" onClick={handleClearAllChips}>
              Clear all
            </button>
          )}
        </div>

        {/* 4 Stats Cards row */}
        <div className="trends-stats-cards-row">
          <div className="trend-stat-card">
            <span className="stat-card-label">Total Publications</span>
            <h3 className="stat-card-value">1,284,452</h3>
            <span className="stat-card-trend-text positive">↑ 18.6% <span className="sub">vs 2015 - 2024</span></span>
          </div>
          <div className="trend-stat-card">
            <span className="stat-card-label">Avg. Annual Growth</span>
            <h3 className="stat-card-value">21.3%</h3>
            <span className="stat-card-trend-text positive">↑ 2.4% <span className="sub">vs 2015 - 2024</span></span>
          </div>
          <div className="trend-stat-card">
            <span className="stat-card-label">Emerging Topics</span>
            <h3 className="stat-card-value">38</h3>
            <span className="stat-card-trend-text positive">↑ 26.7% <span className="sub">vs 2015 - 2024</span></span>
          </div>
          <div className="trend-stat-card">
            <span className="stat-card-label">Breakout Topics</span>
            <h3 className="stat-card-value">12</h3>
            <span className="stat-card-trend-text positive">↑ 33.3% <span className="sub">vs 2015 - 2024</span></span>
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
              <svg viewBox="0 0 380 120" className="trends-svg-chart">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#157f91" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#157f91" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaChartPathData.areaPath} fill="url(#areaGrad)" />
                <path d={areaChartPathData.linePath} fill="none" stroke="#157f91" strokeWidth="2.5" strokeLinecap="round" />
                {areaChartPathData.coords.map((c, i) => (
                  <circle key={i} cx={c.x} cy={c.y} r="3" fill="#ffffff" stroke="#157f91" strokeWidth="1.5" />
                ))}
              </svg>
              <div className="trends-chart-axis-x">
                <span>2015</span>
                <span>2020</span>
                <span>2025</span>
              </div>
            </div>
            <p className="trends-chart-subtext">
              The number of publications has grown <strong>5.3x</strong> from 24.1K in 2015 to 128.6K in 2025.
            </p>
          </article>

          {/* Card 2: Keyword/Topic Comparison */}
          <article className="trends-chart-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Keyword/Topic Comparison</h3>
              <span className="badge-chip">Cumulative</span>
            </div>
            <div className="trends-svg-chart-container">
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
            </div>
            <div className="comparison-legend-row">
              {comparisonLines.map((line, idx) => (
                <span key={idx} className="legend-chip-item">
                  <span className="dot" style={{ backgroundColor: line.stroke }} />
                  <span className="label">{line.label.length > 8 ? line.label.substring(0, 7) + ".." : line.label}</span>
                </span>
              ))}
            </div>
          </article>

          {/* Card 3: Top Trending Topics list */}
          <article className="trends-table-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Top Trending Topics</h3>
              <span className="badge-chip">Top 5</span>
            </div>
            <div className="trends-compact-table-wrap">
              <table className="trends-compact-table">
                <thead>
                  <tr>
                    <th>Topic</th>
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
                      <td className="positive">{topic.growth || "+24%"}</td>
                    </tr>
                  ))}
                  {trendingTopics.length === 0 && (
                    <>
                      <tr>
                        <td><div className="trends-topic-cell"><span className="rank-num">1</span><span>Large Language Models</span></div></td>
                        <td>12,842</td>
                        <td className="positive">+32.4%</td>
                      </tr>
                      <tr>
                        <td><div className="trends-topic-cell"><span className="rank-num">2</span><span>Diffusion Models</span></div></td>
                        <td>8,923</td>
                        <td className="positive">+27.8%</td>
                      </tr>
                      <tr>
                        <td><div className="trends-topic-cell"><span className="rank-num">3</span><span>Graph Neural Networks</span></div></td>
                        <td>6,936</td>
                        <td className="positive">+26.1%</td>
                      </tr>
                    </>
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
              <h3>Top Growing Topics (by Growth Rate)</h3>
              <span className="badge-chip">Growth</span>
            </div>
            <div className="trends-sparkline-list">
              {trendingTopics.slice(0, 3).map((topic, idx) => (
                <div key={topic.id} className="trends-sparkline-row">
                  <div className="topic-rank-name">
                    <span className="bullet-dot" />
                    <span className="name">{topic.name}</span>
                  </div>
                  <div className="sparkline-stats">
                    <span className="growth-text">+{topic.growth || "27.8%"}</span>
                    <svg width="60" height="30" className="sparkline-mini">
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        points={getSparklinePoints(topic.growth, idx)}
                      />
                    </svg>
                  </div>
                </div>
              ))}
              {trendingTopics.length === 0 && (
                <>
                  <div className="trends-sparkline-row">
                    <div className="topic-rank-name"><span className="bullet-dot" /><span>Diffusion Models</span></div>
                    <div className="sparkline-stats">
                      <span className="growth-text">+27.8%</span>
                      <svg width="60" height="30"><polyline fill="none" stroke="#10b981" strokeWidth="1.5" points="0,25 10,20 20,22 30,12 40,16 50,5 60,8" /></svg>
                    </div>
                  </div>
                  <div className="trends-sparkline-row">
                    <div className="topic-rank-name"><span className="bullet-dot" /><span>Vision-Language Models</span></div>
                    <div className="sparkline-stats">
                      <span className="growth-text">+22.9%</span>
                      <svg width="60" height="30"><polyline fill="none" stroke="#10b981" strokeWidth="1.5" points="0,28 10,24 20,18 30,22 40,14 50,8 60,6" /></svg>
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>

          {/* Card 2: Topic Momentum (Acceleration) */}
          <article className="trends-bottom-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Topic Momentum (Acceleration)</h3>
              <span className="badge-chip">Momentum</span>
            </div>
            <div className="trends-sparkline-list">
              {trendingTopics.slice(2, 5).map((topic, idx) => (
                <div key={topic.id} className="trends-sparkline-row">
                  <div className="topic-rank-name">
                    <span className="bullet-dot bg-blue" />
                    <span className="name">{topic.name}</span>
                  </div>
                  <div className="sparkline-stats">
                    <span className="momentum-score">{(1.8 - idx * 0.15).toFixed(2)} Score</span>
                    <svg width="60" height="30" className="sparkline-mini">
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                        points={getSparklinePoints(topic.growth, idx + 4)}
                      />
                    </svg>
                  </div>
                </div>
              ))}
              {trendingTopics.length === 0 && (
                <>
                  <div className="trends-sparkline-row">
                    <div className="topic-rank-name"><span className="bullet-dot bg-blue" /><span>Vision-Language Models</span></div>
                    <div className="sparkline-stats">
                      <span className="momentum-score">1.86 Score</span>
                      <svg width="60" height="30"><polyline fill="none" stroke="#2563eb" strokeWidth="1.5" points="0,25 15,22 30,14 45,10 60,4" /></svg>
                    </div>
                  </div>
                  <div className="trends-sparkline-row">
                    <div className="topic-rank-name"><span className="bullet-dot bg-blue" /><span>Diffusion Models</span></div>
                    <div className="sparkline-stats">
                      <span className="momentum-score">1.74 Score</span>
                      <svg width="60" height="30"><polyline fill="none" stroke="#2563eb" strokeWidth="1.5" points="0,28 15,22 30,19 45,11 60,8" /></svg>
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>

          {/* Card 3: AI-Generated Insights */}
          <article className="trends-bottom-panel glassmorphic-panel">
            <div className="panel-header-row">
              <h3>Analytical Insights</h3>
              <span className="badge-chip bg-orange">Insights</span>
            </div>
            <div className="trends-insights-scroll-list">
              <div className="insight-card-item">
                <div className="insight-icon-circle green">
                  <FiLayers />
                </div>
                <p>
                  <strong>Large Language Models (LLMs)</strong> remains the dominant topic in 2025 with 12,842 publications, exhibiting 32.4% year-on-year growth.
                </p>
              </div>
              <div className="insight-card-item">
                <div className="insight-icon-circle blue">
                  <FiTrendingUp />
                </div>
                <p>
                  <strong>Diffusion Models</strong> holds the highest growth acceleration rate (27.8%) and strong momentum score, indicating solid sustained research interest.
                </p>
              </div>
            </div>
          </article>

        </div>

      </div>
    </MainLayout>
  );
}

export default TrendsPage;
