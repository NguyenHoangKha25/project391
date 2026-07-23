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
  FiTag,
  FiShield,
  FiAward,
  FiBookOpen,
} from "react-icons/fi";
import { useAuth } from "../../context/useAuth";
import { ROUTE_PATHS } from "../../routes/routePaths";
import { searchPapers } from "../../services/paperService";
import { normalizePaper, toArray } from "../../utils/apiData";
import "../../styles/layout.css";

function UserAvatar({ name, role, size = "sm" }) {
  const initial = String(name || "R").trim().charAt(0).toUpperCase();

  let RoleIcon = FiUser;
  let roleClass = "role-user";
  const r = String(role || "").toUpperCase();
  if (r.includes("ADMIN")) {
    RoleIcon = FiShield;
    roleClass = "role-admin";
  } else if (r.includes("LECTURER")) {
    RoleIcon = FiBookOpen;
    roleClass = "role-lecturer";
  } else if (r.includes("RESEARCHER")) {
    RoleIcon = FiAward;
    roleClass = "role-researcher";
  }

  return (
    <div className={`st-avatar-wrap size-${size}`}>
      <div className="st-avatar-badge">
        <span className="st-avatar-letter">{initial}</span>
        <FiUser className="st-avatar-icon-bg" />
      </div>
      <span className={`st-avatar-role-tag ${roleClass}`} title={role}>
        <RoleIcon />
      </span>
    </div>
  );
}

function Navbar({
  title = "Dashboard",
  subtitle = "ScienceTrend Hub workspace",
  onMenuClick,
}) {
  const navigate = useNavigate();
  const [pendingLogout, setPendingLogout] = useState(false);

  const { user, role: rawRole, displayRole, isAdminUser, logoutUser, isLoggedIn } = useAuth();
  const accountRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Search suggestions states
  const searchRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const displayName = useMemo(
    () => user.fullName || user.name || user.username || user.email || "Researcher",
    [user],
  );
  const role = displayRole;
  const canUseReports = ["LECTURER", "RESEARCHER", "ADMIN"].includes(rawRole);

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

  async function fetchSuggestions(query) {
    try {
      setLoadingSuggestions(true);
      setShowSuggestions(true);
      const response = await searchPapers(query, { size: 12 });
      const papersList = toArray(response ? (response.content || response) : []);

      const list = [];
      const queryLower = query.toLowerCase();

      papersList.forEach(p => {
        const paperNormalized = normalizePaper(p);
        
        // 1. Check title
        if (paperNormalized.title.toLowerCase().includes(queryLower)) {
          list.push({ type: "title", value: paperNormalized.title });
        }

        // 2. Check authors
        if (paperNormalized.authors) {
          const authorList = paperNormalized.authors.split(",").map(a => a.trim());
          authorList.forEach(author => {
            if (author.toLowerCase().includes(queryLower)) {
              list.push({ type: "author", value: author });
            }
          });
        }

        // 3. Check keywords
        const keywords = Array.isArray(p.keywords) 
          ? p.keywords 
          : (p.keyword ? [p.keyword] : []);
        keywords.forEach(kw => {
          const kwStr = typeof kw === "string" ? kw : (kw.name || kw.keyword || "");
          if (kwStr.toLowerCase().includes(queryLower)) {
            list.push({ type: "keyword", value: kwStr });
          }
        });
      });

      // Filter unique suggestions by lowercase value
      const unique = [];
      const seen = new Set();
      list.forEach(item => {
        const key = `${item.type}:${item.value.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      });

      setSuggestions(unique.slice(0, 8)); // Limit to max 8 suggestions
      setShowSuggestions(true);
    } catch (err) {
      console.error("Error fetching search suggestions", err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  // Debounced autocomplete search
  useEffect(() => {
    if (searchValue.trim().length < 2) return;

    const timer = setTimeout(() => {
      fetchSuggestions(searchValue.trim());
    }, 280);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Click outside to close suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const query = searchValue.trim();
    setShowSuggestions(false);

    navigate(
      query
        ? `${ROUTE_PATHS.PAPERS}?q=${encodeURIComponent(query)}`
        : ROUTE_PATHS.PAPERS,
    );
  }

  function handleSuggestionClick(sug) {
    setSearchValue(sug.value);
    setShowSuggestions(false);
    
    const path = sug.type === "author"
      ? `${ROUTE_PATHS.PAPERS}?author=${encodeURIComponent(sug.value)}`
      : sug.type === "keyword"
        ? `${ROUTE_PATHS.PAPERS}?keyword=${encodeURIComponent(sug.value)}`
        : `${ROUTE_PATHS.PAPERS}?q=${encodeURIComponent(sug.value)}`;
    navigate(path);
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
        <form 
          className="st-search-form" 
          role="search" 
          onSubmit={handleSearch}
          ref={searchRef}
        >
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSearchValue(nextValue);
              setShowSuggestions(nextValue.trim().length >= 2);
              if (nextValue.trim().length < 2) setSuggestions([]);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="Search papers, journals…"
            aria-label="Search research papers, journals, and keywords"
          />
          {showSuggestions && searchValue.trim().length >= 2 && (
            <div className="st-search-suggestions">
              {loadingSuggestions && (
                <div className="st-suggestion-state">Searching research papers…</div>
              )}
              {!loadingSuggestions && suggestions.length === 0 && (
                <div className="st-suggestion-state">No matching results. Press Enter to search all papers.</div>
              )}
              {!loadingSuggestions && suggestions.map((sug, idx) => (
                <button
                  type="button"
                  key={idx} 
                  className="st-suggestion-item" 
                  onClick={() => handleSuggestionClick(sug)}
                >
                  {sug.type === "title" && <FiFileText style={{ color: "#2563eb", flexShrink: 0 }} />}
                  {sug.type === "author" && <FiUser style={{ color: "#7c3aed", flexShrink: 0 }} />}
                  {sug.type === "keyword" && <FiTag style={{ color: "#ea580c", flexShrink: 0 }} />}
                  <span className="suggestion-text" title={sug.value}>{sug.value}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {isLoggedIn ? (
          <>
            <button
              type="button"
              className="st-icon-btn"
              aria-label="Open notifications dashboard and system alerts"
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
            <UserAvatar name={displayName} role={rawRole || role} size="sm" />
            <span className="st-user-copy">
              <strong title={displayName}>{displayName}</strong>
              <small>{role}</small>
            </span>
            <FiChevronDown
              className={`st-account-chevron ${accountOpen ? "open" : ""}`}
            />
          </button>

          {accountOpen && (
            <div className="st-account-menu">
              <div className="st-account-summary">
                <UserAvatar name={displayName} role={rawRole || role} size="lg" />
                <div>
                  <strong>{displayName}</strong>
                  <small>{user.email || role}</small>
                </div>
              </div>

              <button type="button" onClick={() => goTo(ROUTE_PATHS.MY_ACCOUNT)}>
                <FiUser />
                My account
              </button>
              <button type="button" onClick={() => goTo(ROUTE_PATHS.BOOKMARKS)}>
                <FiFileText />
                My library
              </button>
              {canUseReports && (
                <button type="button" onClick={() => goTo(ROUTE_PATHS.REPORTS)}>
                  <FiSettings />
                  Reports
                </button>
              )}

              {isAdminUser && (
                <button type="button" onClick={() => goTo(ROUTE_PATHS.ADMIN)}>
                  <FiSettings />
                  Admin panel
                </button>
              )}

              <div className="st-account-divider" />

              <button
                type="button"
                className="st-account-logout"
                onClick={handleLogout}
              >
                <FiLogOut />
                Log out
              </button>
            </div>
          )}
            </div>
          </>
        ) : (
          <div className="st-guest-actions">
            <button type="button" className="st-guest-login" onClick={() => navigate(ROUTE_PATHS.LOGIN)}>
              Log in
            </button>
            <button type="button" className="st-guest-register" onClick={() => navigate(ROUTE_PATHS.REGISTER)}>
              Create account
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
