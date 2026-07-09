import { useCallback, useEffect, useState } from "react";
import { FiBookOpen, FiFileText, FiKey, FiRefreshCw, FiDatabase, FiShield } from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/useAuth";
import { getDashboardOverview } from "../services/dashboardService";
import { getCurrentUser } from "../services/userService";
import { apiRequest } from "../services/api";
import { normalizeDashboard, formatNumber } from "../utils/apiData";
import { formatRoleForDisplay } from "../utils/authStorage";
import "../styles/WorkspacePages.css";
import "../styles/AdminPage.css";

function AdminPage() {
  const { user: storedUser, refreshAuthState } = useAuth();
  const [user, setUser] = useState(storedUser || {});
  const [dashboard, setDashboard] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      // Chạy song song 3 request: /api/auth/me, /api/dashboard/summary, /api/admin/sync/logs
      const [userResult, dashboardResult, logsResult] = await Promise.allSettled([
        getCurrentUser(),
        getDashboardOverview(),
        apiRequest("/admin/sync/logs"),
      ]);

      if (userResult.status === "fulfilled" && userResult.value) {
        const backendUser = userResult.value;
        const mergedUser = { ...storedUser, ...backendUser };
        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
        refreshAuthState();
      }

      if (dashboardResult.status === "fulfilled") {
        setDashboard(normalizeDashboard(dashboardResult.value));
      }

      if (logsResult.status === "fulfilled") {
        const logsArray = Array.isArray(logsResult.value) ? logsResult.value : [];
        setSyncLogs(logsArray.slice(0, 5)); // Chỉ show 5 gần nhất
      }
    } catch (error) {
      console.error("Cannot load admin data", error);
      setErrorMessage(error.message || "Cannot load admin data from backend.");
    } finally {
      setLoading(false);
    }
  }, [refreshAuthState, storedUser]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // POST /api/admin/sync — trigger manual sync
  async function handleTriggerSync() {
    try {
      setSyncing(true);
      setErrorMessage("");
      await apiRequest("/admin/sync", { method: "POST" });
      await loadAdminData(); // Reload để thấy log mới
    } catch (error) {
      console.error("Sync failed", error);
      setErrorMessage(error.message || "Sync trigger failed.");
    } finally {
      setSyncing(false);
    }
  }

  const displayName = user.username || user.email || "Admin";

  const statCards = dashboard
    ? [
        { title: "Total Papers", value: formatNumber(dashboard.totalPapers), icon: FiFileText, description: `${formatNumber(dashboard.openAlexPapers)} from OpenAlex` },
        { title: "Total Journals", value: formatNumber(dashboard.totalJournals), icon: FiBookOpen },
        { title: "Total Keywords", value: formatNumber(dashboard.totalKeywords), icon: FiKey },
        { title: "Sync Success Rate", value: dashboard.failedSyncs + dashboard.successfulSyncs > 0
            ? `${Math.round((dashboard.successfulSyncs / (dashboard.successfulSyncs + dashboard.failedSyncs)) * 100)}%`
            : "N/A",
          icon: FiDatabase,
          trend: dashboard.failedSyncs > 0 ? "negative" : "positive",
          description: `${dashboard.successfulSyncs} ok / ${dashboard.failedSyncs} failed`,
        },
      ]
    : [];

  return (
    <MainLayout title="Admin" subtitle="System management and data sync">
      <section className="workspace-page admin-page">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-copy">
            <h2>Admin Panel</h2>
            <p>Manage data sync and view system statistics. Only accessible to ADMIN accounts.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="workspace-button primary"
              onClick={handleTriggerSync}
              disabled={syncing || loading}
            >
              <FiRefreshCw style={{ animation: syncing ? "cm-spin 0.7s linear infinite" : "none" }} />
              {syncing ? "Syncing..." : "Trigger Sync"}
            </button>
            <button type="button" className="workspace-button" onClick={loadAdminData} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {errorMessage && (
          <div style={{ padding: "10px 14px", marginBottom: 14, borderRadius: 8, background: "var(--st-danger-soft)", color: "var(--st-danger)", fontSize: 13 }}>
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="cm-loading" style={{ minHeight: 240, fontSize: 14 }}>Loading admin data...</div>
        ) : (
          <div className="workspace-grid two-columns-wide">
            {/* Stat strip */}
            {statCards.length > 0 && (
              <div className="workspace-stats-strip full-width">
                {statCards.map((card) => (
                  <StatCard key={card.title} {...card} />
                ))}
              </div>
            )}

            {/* Profile */}
            <article className="workspace-panel">
              <div className="workspace-panel-header">
                <h2>Account Information</h2>
                <span><FiShield style={{ marginRight: 4 }} />ADMIN</span>
              </div>
              <div className="workspace-profile-row"><span>Username</span><strong>{displayName}</strong></div>
              <div className="workspace-profile-row"><span>Email</span><strong>{user.email || "—"}</strong></div>
              <div className="workspace-profile-row"><span>Role</span><strong>{formatRoleForDisplay(user.role)}</strong></div>
              <div className="workspace-profile-row"><span>User ID</span><strong>{user.userId || "—"}</strong></div>
            </article>

            {/* Sync Logs */}
            <article className="workspace-panel">
              <div className="workspace-panel-header">
                <h2>Recent Sync Logs</h2>
                <span>GET /api/admin/sync/logs</span>
              </div>
              {syncLogs.length > 0 ? (
                <div className="workspace-list">
                  {syncLogs.map((log, i) => (
                    <div key={log.id ?? i} style={{ padding: "10px 4px", borderBottom: "1px solid #eae4d8", fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <strong style={{ color: "var(--st-heading)" }}>
                          {log.status === "SUCCESS" || log.status === "COMPLETED" ? "✓" : "✗"} {log.status ?? "Unknown"}
                        </strong>
                        <span style={{ color: "var(--st-muted)", fontSize: 11 }}>{log.startedAt ?? log.createdAt ?? ""}</span>
                      </div>
                      <span style={{ color: "var(--st-muted)" }}>
                        {log.message ?? log.details ?? `${log.newRecords ?? 0} new records synced`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="workspace-empty" style={{ margin: "12px 0" }}>No sync logs found.</div>
              )}
            </article>

            {/* Dashboard summary */}
            {dashboard && (
              <article className="workspace-panel full-width">
                <div className="workspace-panel-header">
                  <h2>Top Keywords</h2>
                  <span>GET /api/dashboard/summary</span>
                </div>
                {dashboard.topKeywords.length > 0 ? (
                  <div className="workspace-list">
                    {dashboard.topKeywords.slice(0, 8).map((kw, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr 60px", gap: 10, alignItems: "center", padding: "9px 4px", borderBottom: "1px solid #eae4d8", fontSize: 13 }}>
                        <span style={{ color: "var(--st-muted)", fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                        <span style={{ color: "var(--st-heading)", fontWeight: 550 }}>{kw.label}</span>
                        <span style={{ color: "var(--st-primary)", fontWeight: 650, textAlign: "right" }}>{formatNumber(kw.value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="workspace-empty" style={{ margin: "12px 0" }}>No keyword data available.</div>
                )}
              </article>
            )}
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default AdminPage;
