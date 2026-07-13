import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiChevronDown,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiSettings,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../../context/useAuth";
import { ROUTE_PATHS } from "../../routes/routePaths";
import "../../styles/layout.css";

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Navbar({
  title = "Dashboard",
  subtitle = "ScienceTrend Hub workspace",
  onMenuClick,
}) {
  const navigate = useNavigate();
  const [pendingLogout, setPendingLogout] = useState(false);

  const { user, displayRole, isAdminUser, logoutUser, isLoggedIn } = useAuth();
  const accountRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const displayName = useMemo(
    () => user.username || user.name || user.fullName || user.email || "Researcher",
    [user],
  );
  const role = displayRole;
  const initials = getInitials(displayName) || "R";

  useEffect(() => {
    function handlePointerDown(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const query = searchValue.trim();

    navigate(
      query
        ? `${ROUTE_PATHS.PAPERS}?q=${encodeURIComponent(query)}`
        : ROUTE_PATHS.PAPERS,
    );
  }

  function goTo(path) {
    setAccountOpen(false);
    navigate(path);
  }

  // Wait for isLoggedIn to become false AFTER logoutUser clears auth state,
  // then navigate — avoids PublicOnlyRoute seeing stale isLoggedIn=true and
  // immediately redirecting back to /dashboard.
  useEffect(() => {
    if (pendingLogout && !isLoggedIn) {
      setPendingLogout(false);
      navigate(ROUTE_PATHS.LOGIN, { replace: true });
    }
  }, [pendingLogout, isLoggedIn, navigate]);

  function handleLogout() {
    logoutUser();        // clears localStorage + triggers async setState
    setPendingLogout(true); // navigate will fire once isLoggedIn flips to false
  }

  return (
    <header className="st-navbar">
      <div className="st-navbar-heading">
        <button
          type="button"
          className="st-mobile-menu-btn"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <FiMenu />
        </button>

        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="st-navbar-actions">
        <form className="st-search-form" role="search" onSubmit={handleSearch}>
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search papers, journals…"
            aria-label="Search papers or journals"
          />
          <span>Enter</span>
        </form>

        <button
          type="button"
          className="st-icon-btn"
          aria-label="Open notifications"
          onClick={() => navigate(ROUTE_PATHS.NOTIFICATIONS)}
        >
          <FiBell />
          <span className="st-notification-dot" />
        </button>

        <div className="st-account" ref={accountRef}>
          <button
            type="button"
            className="st-account-trigger"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((current) => !current)}
          >
            <span className="st-avatar">{initials}</span>
            <span className="st-user-copy">
              <strong>{displayName}</strong>
              <small>{role}</small>
            </span>
            <FiChevronDown
              className={`st-account-chevron ${accountOpen ? "open" : ""}`}
            />
          </button>

          {accountOpen && (
            <div className="st-account-menu">
              <div className="st-account-summary">
                <span className="st-avatar">{initials}</span>
                <div>
                  <strong>{displayName}</strong>
                  <small>{user.email || role}</small>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => goTo(ROUTE_PATHS.MY_ACCOUNT)}
                style={{ color: "#1c2533", fontWeight: "780" }}
              >
                <FiUser style={{ color: "#1c2533" }} />
                My account
              </button>
              <button 
                type="button" 
                onClick={() => goTo(ROUTE_PATHS.LIBRARY)}
                style={{ color: "#1c2533", fontWeight: "780" }}
              >
                <FiFileText style={{ color: "#1c2533" }} />
                My library
              </button>
              <button 
                type="button" 
                onClick={() => goTo(ROUTE_PATHS.REPORTS)}
                style={{ color: "#1c2533", fontWeight: "780" }}
              >
                <FiSettings style={{ color: "#1c2533" }} />
                Reports
              </button>

              {isAdminUser && (
                <button 
                  type="button" 
                  onClick={() => goTo(ROUTE_PATHS.ADMIN)}
                  style={{ color: "#1c2533", fontWeight: "780" }}
                >
                  <FiSettings style={{ color: "#1c2533" }} />
                  Admin panel
                </button>
              )}

              <div className="st-account-divider" />

              <button
                type="button"
                className="st-account-logout"
                onClick={handleLogout}
                style={{ color: "#dc2626", fontWeight: "780" }}
              >
                <FiLogOut style={{ color: "#dc2626" }} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
