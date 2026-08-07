import { NavLink } from "react-router-dom";
import {
  FiBarChart2,
  FiBell,
  FiBookmark,
  FiSettings,
  FiTrendingUp,
  FiGrid,
  FiSearch,
  FiTag,
  FiUsers,
  FiBookOpen,
  FiKey,
  FiGitBranch,
} from "react-icons/fi";
import logo from "../../assets/images/logo-login.png";
import { useAuth } from "../../context/useAuth";
import { ROUTE_PATHS } from "../../routes/routePaths";
import "../../styles/layout.css";

const menuGroups = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: ROUTE_PATHS.DASHBOARD, icon: FiGrid, authenticated: true },
    ],
  },
  {
    label: "Discover",
    items: [
      { label: "Search Papers", path: ROUTE_PATHS.PAPERS, icon: FiSearch, public: true },
      { label: "Topics", path: ROUTE_PATHS.TOPICS, icon: FiTag, public: true },
      { label: "Journals", path: ROUTE_PATHS.JOURNALS, icon: FiBookOpen, public: true },
      { label: "Keywords", path: ROUTE_PATHS.KEYWORDS, icon: FiKey, public: true },
      { label: "Trends", path: ROUTE_PATHS.TRENDS, icon: FiTrendingUp, roles: ["LECTURER", "RESEARCHER", "ADMIN"] },
    ],
  },
  {
    label: "My research",
    items: [
      { label: "Bookmarks", path: ROUTE_PATHS.BOOKMARKS, icon: FiBookmark, authenticated: true },
      { label: "Notifications", path: ROUTE_PATHS.NOTIFICATIONS, icon: FiBell, authenticated: true },
    ],
  },
  {
    label: "Research tools",
    items: [
      { label: "Reports", path: ROUTE_PATHS.REPORTS, icon: FiBarChart2, roles: ["LECTURER", "RESEARCHER", "ADMIN"] },
      { label: "Research Lab", path: ROUTE_PATHS.RESEARCH_LAB, icon: FiGitBranch, roles: ["RESEARCHER", "ADMIN"] },
      { label: "Admin", path: ROUTE_PATHS.ADMIN, icon: FiSettings, adminOnly: true },
    ],
  },
];

function Sidebar({ isOpen = false, onNavigate }) {
  const { displayRole, isAdminUser, isLoggedIn, role, user } = useAuth();
  const activeAccountName = isLoggedIn
    ? user?.username || user?.fullName || user?.name || user?.email || "Signed-in user"
    : "Guest access";
  const activeAccountDetail = isLoggedIn
    ? displayRole || role || "Research member"
    : "Public research catalog";
  const canDisplayItem = (item) => {
    if (item.adminOnly) return isAdminUser;
    if (item.authenticated && !isLoggedIn) return false;
    if (item.roles) return isLoggedIn && item.roles.includes(role);
    return item.public || isLoggedIn;
  };
  const visibleGroups = menuGroups
    .map((group) => ({ ...group, items: group.items.filter(canDisplayItem) }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className={`st-sidebar ${isOpen ? "is-open" : ""}`} aria-label="Sidebar navigation">
      <NavLink
        to={ROUTE_PATHS.DASHBOARD}
        className="st-brand"
        onClick={onNavigate}
      >
        <span className="st-brand-logo">
          <img src={logo} alt="ScienceTrend Hub logo" />
        </span>
        <span>
          <strong>ScienceTrend</strong>
          <small>Scientific Research Hub</small>
        </span>
      </NavLink>

      <div className="st-menu">
        {visibleGroups.map((group) => (
          <section className="st-menu-group" key={group.label} aria-label={group.label}>
            <div className="st-menu-label">{group.label}</div>
            <div className="st-menu-group-links">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `st-menu-link ${isActive ? "active" : ""}`
                    }
                  >
                    <span className="st-menu-icon"><Icon aria-hidden="true" /></span>
                    <span>{item.label}</span>
                    <span className="st-menu-active-dot" aria-hidden="true" />
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className={`st-sidebar-footer ${isLoggedIn ? "is-account-active" : "is-guest-session"}`}>
        <span className="st-status-dot" />
        <div className="st-sidebar-account-copy">
          <strong title={activeAccountName}>{activeAccountName}</strong>
          <small title={activeAccountDetail}>{activeAccountDetail}</small>
        </div>
        <span className="st-sidebar-live">{isLoggedIn ? "Active" : "Guest"}</span>
      </div>
    </nav>
  );
}

export default Sidebar;
