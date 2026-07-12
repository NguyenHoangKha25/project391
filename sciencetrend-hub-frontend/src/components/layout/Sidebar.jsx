import { NavLink } from "react-router-dom";
import {
  FiBarChart2,
  FiBell,
  FiBookmark,
  FiFileText,
  FiGrid,
  FiSettings,
  FiTrendingUp,
} from "react-icons/fi";
import logo from "../../assets/images/logo-login.png";
import { useAuth } from "../../context/useAuth";
import { ROUTE_PATHS } from "../../routes/routePaths";
import "../../styles/layout.css";

const menuItems = [
  { label: "Dashboard", path: ROUTE_PATHS.DASHBOARD, icon: FiGrid },
  { label: "Papers", path: ROUTE_PATHS.PAPERS, icon: FiFileText },
  { label: "Trends", path: ROUTE_PATHS.TRENDS, icon: FiTrendingUp },
  { label: "Bookmarks", path: ROUTE_PATHS.BOOKMARKS, icon: FiBookmark },
  { label: "Reports", path: ROUTE_PATHS.REPORTS, icon: FiBarChart2 },
  {
    label: "Notifications",
    path: ROUTE_PATHS.NOTIFICATIONS,
    icon: FiBell,
  },
  {
    label: "Admin",
    path: ROUTE_PATHS.ADMIN,
    icon: FiSettings,
    adminOnly: true,
  },
];

function Sidebar({ isOpen = false, onNavigate }) {
  const { isAdminUser } = useAuth();
  const visibleMenuItems = menuItems.filter((item) => !item.adminOnly || isAdminUser);

  return (
    <aside className={`st-sidebar ${isOpen ? "is-open" : ""}`}>
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

      <nav className="st-menu" aria-label="Main navigation">
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
      </nav>

      <div className="st-sidebar-footer">
        <span className="st-status-dot" />
        <div>
          <strong>Connected</strong>
          <small>Workspace ready</small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
