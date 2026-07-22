import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiBookmark,
  FiCheckCircle,
  FiFileText,
  FiSearch,
  FiShield,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import logo from "../assets/images/logo-login.png";
import { useAuth } from "../context/useAuth";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/HomePage.css";

const featureItems = [
  {
    icon: FiSearch,
    eyebrow: "Discover",
    title: "Search the research catalog",
    description: "Find papers, journals, topics, and keywords from one focused search experience.",
    action: "Browse papers",
    path: ROUTE_PATHS.PAPERS,
    tone: "blue",
  },
  {
    icon: FiBookmark,
    eyebrow: "Organize",
    title: "Keep a useful research library",
    description: "Save important papers and keep followed journals and topics close at hand.",
    action: "Open bookmarks",
    path: ROUTE_PATHS.BOOKMARKS,
    tone: "violet",
  },
  {
    icon: FiTrendingUp,
    eyebrow: "Monitor",
    title: "See where a field is moving",
    description: "Compare publication activity and follow the topics gaining real momentum.",
    action: "Explore trends",
    path: ROUTE_PATHS.TRENDS,
    tone: "cyan",
  },
  {
    icon: FiFileText,
    eyebrow: "Communicate",
    title: "Turn evidence into a report",
    description: "Create structured summaries from the research trail you have already built.",
    action: "View reports",
    path: ROUTE_PATHS.REPORTS,
    tone: "amber",
  },
];

const workspaceModules = [
  { icon: FiSearch, label: "Search", detail: "Papers and journals", tone: "blue" },
  { icon: FiBookmark, label: "Library", detail: "Saved evidence", tone: "violet" },
  { icon: FiTrendingUp, label: "Trends", detail: "Topics over time", tone: "cyan" },
  { icon: FiBarChart2, label: "Reports", detail: "Clear summaries", tone: "amber" },
];

const workflowItems = [
  {
    title: "Start with a focused question",
    description: "Search the catalog and narrow results around the paper, journal, or topic you need.",
  },
  {
    title: "Build an evidence trail",
    description: "Save useful sources and follow the areas you want to revisit without repeating work.",
  },
  {
    title: "Share a clearer outcome",
    description: "Review trends and prepare a report from the research you have already organized.",
  },
];

function HomePage() {
  const { isLoggedIn, defaultPath } = useAuth();
  const primaryPath = isLoggedIn ? defaultPath : ROUTE_PATHS.REGISTER;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start researching";

  useEffect(() => {
    document.title = "ScienceTrend Hub | Research, organized";
  }, []);

  return (
    <main className="home-page home-page-refresh">
      <header className="home-navbar home-navbar-refresh">
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
          <a href="#features">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#audience">For researchers</a>
          <Link to={ROUTE_PATHS.PAPERS}>Browse papers</Link>
        </nav>

        <div className="home-nav-actions">
          {!isLoggedIn && (
            <Link to={ROUTE_PATHS.LOGIN} className="home-ghost-link">
              Sign in
            </Link>
          )}
          <Link to={primaryPath} className="home-login-link">
            {isLoggedIn ? "Dashboard" : "Create account"}
          </Link>
        </div>
      </header>

      <section className="home-hero home-hero-refresh" aria-labelledby="home-title">
        <div className="home-hero-bg" aria-hidden="true">
          <span className="home-orb home-orb-one" />
          <span className="home-orb home-orb-two" />
          <span className="home-grid-lines" />
        </div>

        <div className="home-hero-copy">
          <span className="home-eyebrow">
            <FiZap aria-hidden="true" /> A WORKSPACE FOR ACADEMIC RESEARCH
          </span>
          <h1 id="home-title">
            From scattered papers to a <span className="hero-highlight">research trail you can trust.</span>
          </h1>
          <p>
            Search publications, keep the sources that matter, watch journals and topics, and prepare clear reports without losing your place.
          </p>

          <div className="home-hero-actions">
            <Link to={primaryPath} className="home-primary-link">
              {primaryLabel}
              <FiArrowRight aria-hidden="true" />
            </Link>
            <Link to={ROUTE_PATHS.PAPERS} className="home-secondary-link">
              Browse the catalog
            </Link>
          </div>

          <ul className="home-hero-assurances" aria-label="Platform benefits">
            <li><FiCheckCircle aria-hidden="true" /> One connected workspace</li>
            <li><FiCheckCircle aria-hidden="true" /> Built around real research tasks</li>
            <li><FiCheckCircle aria-hidden="true" /> Clear access by role</li>
          </ul>
        </div>

        <div className="home-hero-visual" aria-label="ScienceTrend workspace overview">
          <div className="home-workspace-demo">
            <div className="home-demo-header">
              <div className="home-demo-brand">
                <span><img src={logo} alt="" /></span>
                <div>
                  <strong>ScienceTrend workspace</strong>
                  <small>Your research, in one place</small>
                </div>
              </div>
              <span className="home-demo-status"><i /> Ready</span>
            </div>

            <div className="home-demo-search">
              <FiSearch aria-hidden="true" />
              <span>Search papers, journals, topics...</span>
              <kbd>⌘ K</kbd>
            </div>

            <div className="home-demo-section-label">
              <span>Workspace</span>
              <small>Choose where to begin</small>
            </div>

            <div className="home-demo-modules">
              {workspaceModules.map(({ icon: Icon, label, detail, tone }) => (
                <div className={`home-demo-module tone-${tone}`} key={label}>
                  <span><Icon aria-hidden="true" /></span>
                  <div>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </div>
                  <FiArrowRight aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="home-demo-footer">
              <span><FiShield aria-hidden="true" /> Your work stays connected</span>
              <strong>Search → Save → Track → Report</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-value-rail" aria-label="Core research workflow">
        <div><span>01</span><strong>Discover</strong><small>Find relevant publications</small></div>
        <div><span>02</span><strong>Organize</strong><small>Keep evidence together</small></div>
        <div><span>03</span><strong>Monitor</strong><small>Follow topics and journals</small></div>
        <div><span>04</span><strong>Report</strong><small>Communicate what matters</small></div>
      </section>

      <section className="home-section home-features-refresh" id="features">
        <div className="home-section-heading home-section-heading-split">
          <div>
            <span className="home-eyebrow">
              <FiShield aria-hidden="true" /> THE PRODUCT
            </span>
            <h2>Useful tools, arranged around your research process</h2>
          </div>
          <p>
            ScienceTrend keeps discovery, organization, monitoring, and reporting close together—so every step builds on the last one.
          </p>
        </div>

        <div className="home-feature-grid home-feature-grid-refresh">
          {featureItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className={`home-feature-card home-feature-card-refresh tone-${item.tone}`} key={item.title}>
                <div className="home-feature-card-top">
                  <span className="home-feature-icon"><Icon aria-hidden="true" /></span>
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </div>
                <small className="home-feature-eyebrow">{item.eyebrow}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link to={item.path} className="home-feature-link">
                  {item.action} <FiArrowRight aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-section home-workflow home-workflow-refresh" id="workflow">
        <div className="home-workflow-copy">
          <span className="home-eyebrow">
            <FiBookOpen aria-hidden="true" /> A SIMPLE WORKFLOW
          </span>
          <h2>Move from a question to a useful outcome</h2>
          <p>
            The workspace follows the natural shape of research instead of forcing you into another complicated system.
          </p>
          <Link to={primaryPath} className="home-inline-link">
            {primaryLabel} <FiArrowRight aria-hidden="true" />
          </Link>
        </div>

        <ol className="home-workflow-list home-workflow-list-refresh">
          {workflowItems.map((item, index) => (
            <li className="home-workflow-item home-workflow-item-refresh" key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section home-audience" id="audience">
        <div className="home-section-heading home-section-heading-split">
          <div>
            <span className="home-eyebrow"><FiUsers aria-hidden="true" /> WHO IT IS FOR</span>
            <h2>Built for people who work with evidence</h2>
          </div>
          <p>Different roles see the tools they need while sharing the same publication catalog and research language.</p>
        </div>

        <div className="home-audience-grid">
          <article>
            <span className="home-audience-icon"><FiBookmark aria-hidden="true" /></span>
            <div>
              <small>Students</small>
              <h3>Stay organized while you learn</h3>
              <p>Search confidently, save sources, and keep the journals and topics behind an assignment or project together.</p>
            </div>
          </article>
          <article>
            <span className="home-audience-icon"><FiBarChart2 aria-hidden="true" /></span>
            <div>
              <small>Lecturers & researchers</small>
              <h3>See patterns and explain them clearly</h3>
              <p>Follow changes across a field, review supporting publications, and prepare structured research reports.</p>
            </div>
          </article>
        </div>
      </section>

      <footer className="home-footer home-footer-refresh">
        <div className="home-footer-main">
          <div className="home-footer-about">
            <Link to={ROUTE_PATHS.HOME} className="home-footer-wordmark" aria-label="ScienceTrend Hub home">
              <i aria-hidden="true" />
              <strong>ScienceTrend</strong><span>Hub</span>
            </Link>
            <p>A focused workspace for discovering publications, organizing evidence, following research activity, and preparing reports.</p>
            <span className="home-footer-promise"><FiCheckCircle aria-hidden="true" /> Built around real academic research tasks</span>
          </div>

          <div className="home-footer-links">
            <nav aria-label="Explore ScienceTrend">
              <strong>Explore</strong>
              <Link to={ROUTE_PATHS.PAPERS}>Papers</Link>
              <Link to={ROUTE_PATHS.TOPICS}>Topics</Link>
              <Link to={ROUTE_PATHS.JOURNALS}>Journals</Link>
              <Link to={ROUTE_PATHS.TRENDS}>Trends</Link>
            </nav>
            <nav aria-label="ScienceTrend workspace">
              <strong>Workspace</strong>
              <Link to={primaryPath}>{isLoggedIn ? "Open dashboard" : "Create account"}</Link>
              {!isLoggedIn && <Link to={ROUTE_PATHS.LOGIN}>Sign in</Link>}
              <Link to={ROUTE_PATHS.BOOKMARKS}>Bookmarks</Link>
              <Link to={ROUTE_PATHS.REPORTS}>Reports</Link>
            </nav>
          </div>
        </div>

        <div className="home-footer-bottom">
          <small>© {new Date().getFullYear()} ScienceTrend Hub</small>
          <span>Research, organized.</span>
        </div>
      </footer>
    </main>
  );
}

export default HomePage;
