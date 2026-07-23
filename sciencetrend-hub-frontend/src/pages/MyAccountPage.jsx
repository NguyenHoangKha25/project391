import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookOpen,
  FiCheckCircle,
  FiFileText,
  FiMail,
  FiRefreshCw,
  FiShield,
  FiUser,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { ROUTE_PATHS } from "../routes/routePaths";
import { getCurrentUser } from "../services/userService";
import { formatRoleForDisplay, normalizeRoleValue } from "../utils/authStorage";
import "../styles/MyAccountPage.css";

const REPORT_ROLES = new Set(["LECTURER", "RESEARCHER", "ADMIN"]);

function getInitials(value) {
  const source = String(value || "").trim();
  if (!source) return "U";

  return source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getUserPayload(response) {
  if (!response || typeof response !== "object") return null;
  return response.user && typeof response.user === "object" ? response.user : response;
}

function buildProfile(localUser = {}, remoteUser = {}) {
  const role = normalizeRoleValue(remoteUser.role || localUser.role || "MEMBER");

  return {
    userId: remoteUser.userId || remoteUser.id || localUser.userId || localUser.id || null,
    username: remoteUser.username || localUser.username || "",
    email: remoteUser.email || localUser.email || "",
    role,
    roles: [role],
  };
}

function MyAccountPage() {
  const { user, displayRole, refreshAuthState } = useAuth();
  const [profile, setProfile] = useState(() => buildProfile(user));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const displayName = profile.username || profile.email || "Researcher";
  const email = profile.email || "Email is not available yet";
  const roleLabel = formatRoleForDisplay(profile.role || displayRole);
  const canViewReports = REPORT_ROLES.has(normalizeRoleValue(profile.role || displayRole));
  const initials = useMemo(() => getInitials(displayName || email), [displayName, email]);

  useEffect(() => {
    setProfile(buildProfile(user));
  }, [user]);

  async function refreshProfile() {
    try {
      setLoading(true);
      setNotice("");

      const response = await getCurrentUser();
      const nextProfile = buildProfile(profile, getUserPayload(response));

      localStorage.setItem("user", JSON.stringify(nextProfile));
      setProfile(nextProfile);
      refreshAuthState?.();
      setNotice("Account information updated from backend.");
    } catch (error) {
      console.error("Cannot refresh account profile", error);
      setNotice("Cannot reach backend now. Showing the account saved after login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout title="My Account" subtitle="View your ScienceTrend Hub profile">
      <section className="account-page">
        <article className="account-hero-card">
          <div className="account-hero-bg" aria-hidden="true" />

          <div className="account-avatar-xl" aria-label="Account avatar">
            {initials}
          </div>

          <div className="account-hero-copy">
            <span className="account-eyebrow">Signed-in account</span>
            <h2>{displayName}</h2>
            <p>
              This page shows the username and Gmail/email connected to your current login session.
            </p>
          </div>

          <button
            type="button"
            className="account-refresh-btn"
            onClick={refreshProfile}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "is-spinning" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </article>

        {notice && <div className="account-notice">{notice}</div>}

        <div className="account-grid">
          <article className="account-panel account-info-panel">
            <div className="account-panel-header">
              <div>
                <span className="account-eyebrow">Profile details</span>
                <h3>Account information</h3>
              </div>
              <FiCheckCircle />
            </div>

            <div className="account-detail-list">
              <div className="account-detail-row">
                <span className="account-detail-icon"><FiUser /></span>
                <div>
                  <small>Username</small>
                  <strong>{profile.username || "Username is not available yet"}</strong>
                </div>
              </div>

              <div className="account-detail-row">
                <span className="account-detail-icon"><FiMail /></span>
                <div>
                  <small>Gmail / Email</small>
                  <strong>{email}</strong>
                </div>
              </div>

              <div className="account-detail-row">
                <span className="account-detail-icon"><FiShield /></span>
                <div>
                  <small>Role</small>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            </div>
          </article>

          <aside className="account-panel account-side-panel">
            <span className="account-eyebrow">Quick access</span>
            <h3>Your workspace</h3>
            <p>
              {canViewReports
                ? "Continue with saved papers or open reports directly from your account page."
                : "Continue with papers you have saved for later."}
            </p>

            <div className="account-actions">
              <Link to={ROUTE_PATHS.BOOKMARKS}>
                <FiBookOpen />
                Open my bookmarks
              </Link>
              {canViewReports && (
                <Link to={ROUTE_PATHS.REPORTS}>
                  <FiFileText />
                  View reports
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  );
}

export default MyAccountPage;
