import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiBarChart2,
  FiBookmark,
  FiCheckCircle,
  FiDatabase,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiZap,
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
    description: "Search papers and journals from one place.",
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

        <div className="home-hero-visual" aria-label="ScienceTrend research workflow">
          <div className="research-flow">
            <div className="research-flow-heading">
              <span>One connected workflow</span>
              <h3>Keep the research process simple</h3>
              <p>Each tool has a clear job, from the first search to the final report.</p>
            </div>

            <ol className="research-flow-list">
              <li>
                <span className="research-flow-number">01</span>
                <span className="research-flow-icon"><FiSearch /></span>
                <div>
                  <strong>Search trusted sources</strong>
                  <small>Find papers and journals from one search page.</small>
                </div>
              </li>
              <li>
                <span className="research-flow-number">02</span>
                <span className="research-flow-icon"><FiBookmark /></span>
                <div>
                  <strong>Keep useful work together</strong>
                  <small>Save papers and organize the references you need.</small>
                </div>
              </li>
              <li>
                <span className="research-flow-number">03</span>
                <span className="research-flow-icon"><FiTrendingUp /></span>
                <div>
                  <strong>Follow the field</strong>
                  <small>Watch topics and journals without repeating searches.</small>
                </div>
              </li>
              <li>
                <span className="research-flow-number">04</span>
                <span className="research-flow-icon"><FiBarChart2 /></span>
                <div>
                  <strong>Prepare a clear report</strong>
                  <small>Turn organized research into a useful summary.</small>
                </div>
              </li>
            </ol>

            <div className="research-flow-note">
              <FiCheckCircle />
              <span>Everything stays connected in the same workspace.</span>
            </div>
          </div>
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
