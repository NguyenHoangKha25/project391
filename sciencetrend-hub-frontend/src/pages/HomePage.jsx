import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiBarChart2,
  FiBookOpen,
  FiBookmark,
  FiCheckCircle,
  FiDatabase,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiZap,
  FiGrid,
  FiSettings,
  FiArrowUpRight,
} from "react-icons/fi";
import logo from "../assets/images/logo-login.png";
import { useAuth } from "../context/useAuth";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/HomePage.css";

const featureItems = [
  {
    icon: FiSearch,
    title: "Smart Search",
    description: "Search millions of papers instantly.",
  },
  {
    icon: FiTrendingUp,
    title: "Visual Trends",
    description: "Track scientific topic growth.",
  },
  {
    icon: FiBookmark,
    title: "Bookmarks Manager",
    description: "Save and organize references.",
  },
  {
    icon: FiBarChart2,
    title: "Instant Reports",
    description: "Generate citation summaries.",
  },
];

const stats = [
  { value: "12k+", label: "Academic Papers" },
  { value: "38", label: "Research Topics" },
  { value: "24/7", label: "Instant Access" },
];

const workflowItems = [
  "Find relevant publications",
  "Save papers to bookmarks",
  "Export summary reports",
];

function HomePage() {
  const { isLoggedIn, defaultPath } = useAuth();
  const primaryPath = isLoggedIn ? defaultPath : ROUTE_PATHS.LOGIN;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Login to workspace";

  useEffect(() => {
    document.title = "ScienceTrend Hub | Scientific Journal Publication Tracking";
  }, []);

  return (
    <main className="home-page">
      <div className="home-topbar">
        <div>
          <span>ScienceTrend Research Hub</span>
          <span>A practical research workspace for students and researchers</span>
        </div>
        <div>
          <span>English</span>
        </div>
      </div>

      <header className="home-navbar">
        <Link to={ROUTE_PATHS.HOME} className="home-brand" aria-label="ScienceTrend Hub home">
          <span className="home-brand-logo">
            <img src={logo} alt="ScienceTrend Hub logo" />
          </span>
          <span>
            <strong>ScienceTrend</strong>
            <small>Research Hub</small>
          </span>
        </Link>

        <nav className="home-nav-links" aria-label="Home navigation">
          <a href="#features">Features</a>
          <a href="#insight">Overview</a>
          <a href="#workflow">How it works</a>
          <Link to={ROUTE_PATHS.PAPERS}>Papers</Link>
        </nav>

        <div className="home-nav-actions">
          {!isLoggedIn && (
            <Link to={ROUTE_PATHS.REGISTER} className="home-ghost-link">
              Create account
            </Link>
          )}
          <Link to={primaryPath} className="home-login-link">
            {isLoggedIn ? "Dashboard" : "Login"}
          </Link>
        </div>
      </header>

      <section className="home-hero" id="insight">
        <div className="home-hero-bg" aria-hidden="true">
          <span className="home-orb home-orb-one" />
          <span className="home-orb home-orb-two" />
          <span className="home-grid-lines" />
        </div>

        <div className="home-hero-copy">
          <span className="home-eyebrow">
            <FiZap aria-hidden="true" /> RESEARCH WORKSPACE
          </span>
          <h1>
            Research without <span className="hero-highlight">losing your place.</span>
          </h1>
          <p>
            Search papers, save what matters, follow new topics, and turn your reading into clear reports—all in one workspace.
          </p>

          <div className="home-hero-actions">
            <Link to={primaryPath} className="home-primary-link">
              {primaryLabel}
              <FiArrowUpRight aria-hidden="true" />
            </Link>
            <a href="#features" className="home-secondary-link">
              Explore features
            </a>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="ScienceTrend Hub preview">
          <div className="portal-mockup-app">
            {/* Sidebar Mockup */}
            <aside className="mockup-sidebar">
              <div className="mockup-window-controls">
                <span className="control-close" />
                <span className="control-min" />
                <span className="control-max" />
              </div>
              <div className="mockup-sidebar-logo">
                <FiZap />
              </div>
              <nav className="mockup-sidebar-nav">
                <span className="active"><FiGrid /></span>
                <span><FiBookOpen /></span>
                <span><FiTrendingUp /></span>
                <span><FiBookmark /></span>
                <span><FiBarChart2 /></span>
                <span><FiSettings /></span>
              </nav>
              <div className="mockup-sidebar-avatar" />
            </aside>

            {/* Main Content Mockup */}
            <main className="mockup-content">
              {/* Header Title Info */}
              <header className="mockup-header">
                <div className="mockup-brand-title">
                  <h3>Trends in Sciences Journal Analytics</h3>
                  <small>Volume 23 • ISSN: 2774-0226</small>
                </div>
              </header>

              {/* Rich Multi-Widget Grid */}
              <div className="mockup-grid">
                {/* 1. Unified Overview Card */}
                <section className="mockup-card overview-card">
                  <div className="overview-top-row">
                    <div className="overview-stats">
                      <small>Cumulative Citations & Impact</small>
                      <div className="chart-stats-row">
                        <strong>18,450</strong>
                        <span className="growth-text">+32.6%</span>
                      </div>
                    </div>
                    {/* Small compact radial gauge */}
                    <div className="mini-radial-box">
                      <svg viewBox="0 0 100 100" className="radial-svg">
                        <circle cx="50" cy="50" r="40" stroke="rgba(99,179,237,0.12)" strokeWidth="10" fill="none" />
                        <circle cx="50" cy="50" r="40" stroke="url(#accent-gradient-new)" strokeWidth="10" fill="none" strokeDasharray="251.2" strokeDashoffset="45" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="accent-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#fbbf24" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="radial-text">
                        <strong>86%</strong>
                        <small>AI & ML</small>
                      </div>
                    </div>
                  </div>
                  
                  {/* Full width trend line chart */}
                  <div className="sparkline-chart-main">
                    <svg viewBox="0 0 300 50" className="sparkline-svg-large">
                      <path d="M0 40 Q50 10 100 30 T200 15 T300 5" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                      <circle cx="300" cy="5" r="3.5" fill="#3b82f6" />
                    </svg>
                  </div>
                </section>

                {/* 2. Monitored Publications Card (2 items) */}
                <section className="mockup-card list-card">
                  <div className="card-header-clean">
                    <small>Recently Monitored Publications</small>
                  </div>
                  <div className="feed-list">
                    <div className="feed-item">
                      <div className="feed-info">
                        <strong>GPT-4 Architecture & Scholarly Impact</strong>
                        <span>2026 • 4.8k citations</span>
                      </div>
                      <span className="feed-badge"><FiArrowUpRight /></span>
                    </div>
                    <div className="feed-item">
                      <div className="feed-info">
                        <strong>Quantum Information & Cryptography</strong>
                        <span>2025 • 2.1k citations</span>
                      </div>
                      <span className="feed-badge"><FiArrowUpRight /></span>
                    </div>
                  </div>
                </section>

                {/* 3. Journal Impact Factors Card (2 items) */}
                <section className="mockup-card list-card">
                  <div className="card-header-clean">
                    <small>Core Journal Impact Factors</small>
                  </div>
                  <div className="impact-list">
                    <div className="impact-item">
                      <span>Nature Science Trend</span>
                      <strong>15.4 IF</strong>
                    </div>
                    <div className="impact-item">
                      <span>IEEE Journal of Computing</span>
                      <strong>12.8 IF</strong>
                    </div>
                  </div>
                </section>
              </div>
            </main>
          </div>
        </div>

        <div className="home-stat-strip" aria-label="ScienceTrend quick statistics">
          {stats.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section" id="features">
        <div className="home-section-heading">
          <span className="home-eyebrow">
            <FiShield aria-hidden="true" /> BUILT FOR REAL RESEARCH
          </span>
          <h2>Tools that fit the way you already research</h2>
          <p>
            No complicated setup. Just search, save, follow, and report.
          </p>
        </div>
 
        <div className="home-feature-grid">
          {featureItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="home-feature-card" key={item.title}>
                <span>
                  <Icon aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>
 
      <section className="home-section home-workflow" id="workflow">
        <div className="home-workflow-copy">
          <span className="home-eyebrow">
            <FiDatabase aria-hidden="true" /> HOW IT WORKS
          </span>
          <h2>A shorter path from question to evidence</h2>
          <p>
            Three straightforward steps keep your research moving.
          </p>
        </div>

        <div className="home-workflow-list">
          {workflowItems.map((item, index) => (
            <div className="home-workflow-item" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <FiCheckCircle aria-hidden="true" />
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>ScienceTrend Hub</strong>
          <span>Scientific Journal Publication Tracking System</span>
        </div>
      </footer>
    </main>
  );
}

export default HomePage;
