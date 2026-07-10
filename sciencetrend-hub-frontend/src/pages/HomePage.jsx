import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiBookmark,
  FiCheckCircle,
  FiDatabase,
  FiGlobe,
  FiLayers,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiZap,
  FiGrid,
  FiSettings,
  FiBell,
  FiClock,
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
    title: "Library Manager",
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
  "Build your reference library",
  "Export summary reports",
];

function HomePage() {
  const { isLoggedIn, defaultPath } = useAuth();
  const primaryPath = isLoggedIn ? defaultPath : ROUTE_PATHS.LOGIN;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Login to workspace";

  return (
    <main className="home-page">
      <div className="home-topbar">
        <div>
          <span>ScienceTrend Research Hub</span>
          <span>Publication intelligence for students and researchers</span>
        </div>
        <div>
          <span>Mon - Fri 8.00 - 18.00</span>
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
          <a href="#features">Services</a>
          <a href="#insight">Insights</a>
          <a href="#workflow">Workflow</a>
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
            <FiZap aria-hidden="true" /> FOR STUDENTS & RESEARCHERS
          </span>
          <h1>
            All your academic research, in <span className="hero-highlight">one smart workspace</span>.
          </h1>
          <p>
            Organize your bibliography, track journals, and export citation reports instantly.
          </p>

          <div className="home-hero-actions">
            <a 
              href="#features" 
              className="home-secondary-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "48px",
                padding: "0 24px",
                borderRadius: "99px",
                whiteSpace: "nowrap",
                gap: "8px",
                textDecoration: "none"
              }}
            >
              Explore modules
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
                        <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
                        <circle cx="50" cy="50" r="40" stroke="url(#accent-gradient-new)" strokeWidth="10" fill="none" strokeDasharray="251.2" strokeDashoffset="45" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="accent-gradient-new" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffb900" />
                            <stop offset="100%" stopColor="#f43f5e" />
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
                      <path d="M0 40 Q50 10 100 30 T200 15 T300 5" fill="none" stroke="#10b981" strokeWidth="2.5" />
                      <circle cx="300" cy="5" r="3.5" fill="#10b981" />
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
            <FiShield aria-hidden="true" /> KEY FEATURES
          </span>
          <h2>Everything you need to write and research</h2>
          <p>
            Simple tools built for academic research.
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
          <h2>From search to final report in minutes</h2>
          <p>
            Go from raw search to final draft in minutes.
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
