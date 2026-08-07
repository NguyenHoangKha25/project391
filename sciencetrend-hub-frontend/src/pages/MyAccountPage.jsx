import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiArrowUpRight,
  FiBookOpen,
  FiCheckCircle,
  FiFileText,
  FiLock,
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

const ROLE_WORKSPACE_COPY = {
  ADMIN: "Full catalog operations, system oversight and research intelligence access.",
  RESEARCHER: "Advanced evidence synthesis, mind maps and reporting are ready for your work.",
  LECTURER: "Teaching-focused insights, saved evidence and reporting stay connected here.",
  STUDENT: "Your saved evidence and personal research trail stay connected across the catalog.",
};

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
  const normalizedRole = normalizeRoleValue(profile.role || displayRole);
  const canViewReports = REPORT_ROLES.has(normalizedRole);
  const initials = useMemo(() => getInitials(displayName || email), [displayName, email]);
  const workspaceCopy = ROLE_WORKSPACE_COPY[normalizedRole]
    || "Your identity, access and saved research stay connected in one workspace.";

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
      setNotice("Account information refreshed.");
    } catch (error) {
      console.error("Cannot refresh account profile", error);
      setNotice("Couldn't refresh account information. Showing the last saved details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout title="My Account" subtitle="View your ScienceTrend Hub profile">
      <section className="account-page">
        <article className="account-hero-card">
          <div className="account-hero-bg" aria-hidden="true" />

          <div className="account-identity-cluster">
            <div className="account-avatar-wrap">
              <div className="account-avatar-xl" aria-label="Account avatar">
                {initials}
              </div>
              <span className="account-presence-dot" aria-label="Account is active" />
            </div>

            <div className="account-hero-copy">
              <span className="account-eyebrow account-hero-eyebrow">
                <FiCheckCircle /> Active ScienceTrend identity
              </span>
              <h2>{displayName}</h2>
              <div className="account-hero-meta">
                <span><FiShield /> {roleLabel} access</span>
                <span><FiMail /> {email}</span>
              </div>
              <p>{workspaceCopy}</p>
            </div>
          </div>

          <aside className="account-session-card" aria-label="Current account session">
            <div className="account-session-heading">
              <span><FiActivity /> Workspace access</span>
              <strong>{roleLabel}</strong>
            </div>

            <div className="account-session-status">
              <span><FiLock /> Secure session</span>
              <span><FiCheckCircle /> Identity connected</span>
            </div>

            <button
              type="button"
              className="account-refresh-btn"
              onClick={refreshProfile}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "is-spinning" : ""} />
              {loading ? "Refreshing…" : "Sync account details"}
            </button>
          </aside>
        </article>

        {notice && <div className="account-notice" aria-live="polite">{notice}</div>}

        <div className="account-grid">
          <article className="account-panel account-info-panel">
            <div className="account-panel-header">
              <div>
                <span className="account-eyebrow">Identity details</span>
                <h3>Account information</h3>
                <p>Your current login identity and role permissions.</p>
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
            <div className="account-side-heading">
              <span className="account-eyebrow">Research shortcuts</span>
              <h3>Continue your work</h3>
              <p>
                {canViewReports
                  ? "Return to saved evidence or continue building your research outputs."
                  : "Return to the papers you saved for your next reading session."}
              </p>
            </div>

            <div className="account-actions">
              <Link to={ROUTE_PATHS.BOOKMARKS}>
                <span className="account-action-icon"><FiBookOpen /></span>
                <span className="account-action-copy">
                  <strong>Saved evidence</strong>
                  <small>Open bookmarked papers</small>
                </span>
                <FiArrowUpRight className="account-action-arrow" />
              </Link>
              {canViewReports && (
                <Link to={ROUTE_PATHS.REPORTS}>
                  <span className="account-action-icon"><FiFileText /></span>
                  <span className="account-action-copy">
                    <strong>Research reports</strong>
                    <small>Review generated outputs</small>
                  </span>
                  <FiArrowUpRight className="account-action-arrow" />
                </Link>
              )}
            </div>

            <div className="account-trust-note">
              <FiShield />
              <span>
                <strong>Role-aware workspace</strong>
                <small>Tools and actions follow your {roleLabel} permissions.</small>
              </span>
            </div>
          </aside>
        </div>
      </section>
    </MainLayout>
  );
}

export default MyAccountPage;
