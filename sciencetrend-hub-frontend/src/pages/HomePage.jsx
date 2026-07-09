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
            All your academic research, in <span class="hero-highlight">one smart workspace</span>.
          </h1>
          <p>
            Organize your bibliography, track journals, and export citation reports instantly.
          </p>

          <div className="home-hero-actions">
            <a href="#features" className="home-secondary-link" style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "48px",
              padding: "0 24px",
              borderRadius: "99px",
              whiteSpace: "nowrap",
              gap: "8px",
              textDecoration: "none"
            }}>
              Explore modules
            </a>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="ScienceTrend Hub preview">
          <div className="home-preview-shell">
            <div className="home-preview-top">
              <span />
              <span />
              <span />
              <strong>Live Research Board</strong>
            </div>

            <div className="home-preview-search">
              <FiSearch aria-hidden="true" />
              <span>Search AI ethics, journal ranking, open science...</span>
            </div>

            <div className="home-preview-grid">
              <article className="home-preview-card home-preview-card-large">
                <div>
                  <small>Publication growth</small>
                  <strong>+28.4%</strong>
                </div>
                <div className="home-bars" aria-hidden="true">
                  <span style={{ height: "35%" }} />
                  <span style={{ height: "48%" }} />
                  <span style={{ height: "44%" }} />
                  <span style={{ height: "66%" }} />
                  <span style={{ height: "75%" }} />
                  <span style={{ height: "92%" }} />
                </div>
              </article>

              <article className="home-preview-card">
                <FiGlobe aria-hidden="true" />
                <small>Top journal</small>
                <strong>Nature Research</strong>
              </article>

              <article className="home-preview-card">
                <FiLayers aria-hidden="true" />
                <small>Hot topic</small>
                <strong>Generative AI</strong>
              </article>
            </div>

            <div className="home-topic-ticker" aria-label="Trending research topics">
              <span>Machine Learning</span>
              <span>Health Tech</span>
              <span>Climate Data</span>
              <span>Open Science</span>
            </div>
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
            <FiDatabase aria-hidden="true" /> Workspace flow
          </span>
          <h2>From search to insight in three clean steps.</h2>
          <p>
            Users enter through Home, login with their role, then move into dashboard, papers,
            trends, library and reports without the page feeling like a default template.
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
