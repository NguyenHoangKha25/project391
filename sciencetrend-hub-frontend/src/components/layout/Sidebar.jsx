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
} from "react-icons/fi";
import logo from "../../assets/images/logo-login.png";
import { useAuth } from "../../context/useAuth";
import { ROUTE_PATHS } from "../../routes/routePaths";
import "../../styles/layout.css";

const menuItems = [
  { label: "Dashboard", path: ROUTE_PATHS.DASHBOARD, icon: FiGrid, public: true },
  { label: "Search Papers", path: ROUTE_PATHS.PAPERS, icon: FiSearch, public: true },
  { label: "Topics", path: ROUTE_PATHS.TOPICS, icon: FiTag, public: true },
  { label: "Journals", path: ROUTE_PATHS.JOURNALS, icon: FiBookOpen, public: true },
  { label: "Keywords", path: ROUTE_PATHS.KEYWORDS, icon: FiKey, public: true },
  { label: "Trends", path: ROUTE_PATHS.TRENDS, icon: FiTrendingUp, public: true },
  { label: "Bookmarks", path: ROUTE_PATHS.BOOKMARKS, icon: FiBookmark, authenticated: true },
  { label: "Following", path: ROUTE_PATHS.FOLLOWING, icon: FiUsers, authenticated: true },
  {
    label: "Notifications",
    path: ROUTE_PATHS.NOTIFICATIONS,
    icon: FiBell,
    authenticated: true,
  },
  { label: "Reports", path: ROUTE_PATHS.REPORTS, icon: FiBarChart2, roles: ["LECTURER", "RESEARCHER", "ADMIN"] },
  {
    label: "Admin",
    path: ROUTE_PATHS.ADMIN,
    icon: FiSettings,
    adminOnly: true,
  },
];

function Sidebar({ isOpen = false, onNavigate }) {
  const { isAdminUser, isLoggedIn, role } = useAuth();
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.adminOnly) return isAdminUser;
    if (item.authenticated && !isLoggedIn) return false;
    if (item.roles) return isLoggedIn && item.roles.includes(role);
    return item.public || isLoggedIn;
  });

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
          <small>Research Hub</small>
        </span>
      </NavLink>

      <div className="st-menu-label">Workspace</div>

      <div className="st-menu">
        {visibleMenuItems.map((item) => {
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
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="st-sidebar-footer">
        <span className="st-status-dot" />
        <div>
          <strong>Connected</strong>
          <small>Workspace ready</small>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
