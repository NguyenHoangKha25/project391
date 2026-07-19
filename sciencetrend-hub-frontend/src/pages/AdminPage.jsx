import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiFileText,
  FiKey,
  FiRefreshCw,
  FiDatabase,
  FiShield,
  FiUsers,
  FiCheckCircle,
  FiAlertTriangle,
  FiDownload,
  FiPlus,
  FiSliders,
  FiChevronDown,
  FiArrowRight,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/useAuth";
import { getDashboardOverview } from "../services/dashboardService";
import { getReports, generateReport } from "../services/reportService";
import { apiRequest } from "../services/api";
import { normalizeDashboard, normalizeReport, formatNumber, formatDateTime, toArray } from "../utils/apiData";
import { formatRoleForDisplay } from "../utils/authStorage";
import "../styles/WorkspacePages.css";
import "../styles/AdminPage.css";

/* ── Toast Overlay ── */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  return { toast, showToast };
}

const safeSplitDate = (value) => {
  if (!value) return "Recent";
  if (typeof value === "string") return value.split("T")[0];
  if (Array.isArray(value)) {
    return `${value[0]}-${String(value[1]).padStart(2, "0")}-${String(value[2]).padStart(2, "0")}`;
  }
  return "Recent";
};

// Mock User Data matching mockup design
const MOCK_USERS = [
  { id: 1, username: "dr.researcher", email: "researcher@university.edu", role: "Admin", status: "Active" },
  { id: 2, username: "alice.admin", email: "alice.admin@institute.org", role: "Admin", status: "Active" },
  { id: 3, username: "john.manager", email: "john.manager@university.edu", role: "Manager", status: "Active" },
  { id: 4, username: "rachel.smith", email: "rachel.smith@lab.org", role: "Analyst", status: "Active" },
  { id: 5, username: "tom.baker", email: "tom.baker@student.edu", role: "Viewer", status: "Inactive" }
];

// Mock Data Sources matching mockup design
const MOCK_SOURCES = [
  { id: 1, name: "OpenAlex", status: "Connected", lastSync: "May 20, 2026 08:45 AM", records: "2,847,126" },
  { id: 2, name: "Dimensions", status: "Connected", lastSync: "May 20, 2026 06:30 AM", records: "1,923,456" },
  { id: 3, name: "Scopus", status: "Error", lastSync: "May 20, 2026 04:15 AM", records: "—" }
];

function AdminPage() {
  const { user: storedUser, refreshAuthState } = useAuth();
  const [user, setUser] = useState(storedUser || {});
  const [dashboard, setDashboard] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  // Tab navigation states: 'overview' | 'users' | 'sync' | 'sources' | 'reports' | 'settings'
  const [adminTab, setAdminTab] = useState("overview");

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [dashboardResult, logsResult, reportsResult, usersResult] = await Promise.allSettled([
        getDashboardOverview(),
        apiRequest("/admin/sync/logs"),
        getReports(),
        apiRequest("/admin/users"),
      ]);

      if (dashboardResult.status === "fulfilled") {
        setDashboard(normalizeDashboard(dashboardResult.value));
      }

      if (logsResult.status === "fulfilled") {
        const logsArray = Array.isArray(logsResult.value) ? logsResult.value : [];
        setSyncLogs(logsArray);
      }

      if (reportsResult.status === "fulfilled") {
        setReports(toArray(reportsResult.value).map(normalizeReport));
      }

      if (usersResult.status === "fulfilled") {
        setUsers(toArray(usersResult.value));
      }
    } catch (error) {
      console.error("Cannot load admin data", error);
      setErrorMessage(error.message || "Cannot load admin data from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // POST /api/admin/sync — trigger manual sync
  async function handleTriggerSync() {
    try {
      setSyncing(true);
      setErrorMessage("");
      await apiRequest("/admin/sync", { method: "POST" });
      showToast("Manual synchronization triggered successfully!", "success");
      await loadAdminData(); // Reload to see new log entry
    } catch (error) {
      console.error("Sync failed", error);
      setErrorMessage(error.message || "Sync trigger failed.");
      showToast("Manual synchronization failed to start.", "warning");
    } finally {
      setSyncing(false);
    }
  }

  // Handle report generation
  async function handleCreateReport() {
    try {
      setGeneratingReport(true);
      await generateReport({ type: "summary" });
      showToast("Report generation started successfully!", "success");
      await loadAdminData(); // Reload reports list
    } catch (err) {
      showToast(err.message || "Report generation failed.", "warning");
    } finally {
      setGeneratingReport(false);
    }
  }

  // Handle updating user role
  async function handleUpdateRole(userId, newRole) {
    try {
      showToast("Updating user role...", "info");
      await apiRequest(`/admin/users/${userId}/role`, {
        method: "PUT",
        body: { role: newRole }
      });
      showToast("User role updated successfully!", "success");
      await loadAdminData(); // Reload to refresh list
    } catch (err) {
      console.error("Failed to update user role", err);
      showToast(err.message || "Failed to update role.", "warning");
    }
  }

  // Handle deleting user
  async function handleDeleteUser(userId) {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      showToast("Deleting user...", "info");
      await apiRequest(`/admin/users/${userId}`, {
        method: "DELETE"
      });
      showToast("User deleted successfully!", "success");
      await loadAdminData(); // Reload to refresh list
    } catch (err) {
      console.error("Failed to delete user", err);
      showToast(err.message || "Failed to delete user.", "warning");
    }
  }

  const sources = useMemo(() => {
    const openAlexLogs = syncLogs.filter(log => log.sourceApi === "OpenAlex" || !log.sourceApi);
    const latestLog = openAlexLogs.length > 0 ? openAlexLogs[0] : null;

    let openAlexStatus = "Connected";
    let openAlexLastSync = "—";
    let openAlexRecords = dashboard ? formatNumber(dashboard.openAlexPapers) : "—";

    if (latestLog) {
      if (latestLog.status === "RUNNING") openAlexStatus = "Syncing";
      else if (latestLog.status === "FAILED") openAlexStatus = "Error";
      else openAlexStatus = "Connected";

      const syncTime = latestLog.finishedAt || latestLog.startedAt;
      if (syncTime) {
        openAlexLastSync = formatDateTime(syncTime);
      }
      if (latestLog.paperSynced !== undefined && latestLog.paperSynced !== null) {
        openAlexRecords = formatNumber(latestLog.paperSynced);
      }
    }

    return [
      { id: 1, name: "OpenAlex", status: openAlexStatus, lastSync: openAlexLastSync, records: openAlexRecords },
      { id: 2, name: "Dimensions", status: "Disconnected", lastSync: "—", records: "—" },
      { id: 3, name: "Scopus", status: "Disconnected", lastSync: "—", records: "—" }
    ];
  }, [syncLogs, dashboard]);

  const statCards = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === "Active" || u.status === "ACTIVE" || true).length;
    const successfulSyncs = dashboard ? dashboard.successfulSyncs : 0;
    const failedSyncs = dashboard ? dashboard.failedSyncs : 0;

    return [
      { 
        title: "Total Users", 
        value: String(totalUsers), 
        icon: FiUsers, 
        trend: totalUsers > 0 ? "↑ 100%" : "—", 
        trendText: "Registered accounts", 
        trendType: "positive" 
      },
      { 
        title: "Active Users", 
        value: String(activeUsers), 
        icon: FiShield, 
        trend: activeUsers > 0 ? "↑ 100%" : "—", 
        trendText: "Active accounts", 
        trendType: "positive" 
      },
      {
        title: "Sync Success",
        value: formatNumber(successfulSyncs),
        icon: FiCheckCircle,
        trend: successfulSyncs > 0 ? "↑ 12.4%" : "—",
        trendText: "Completed runs",
        trendType: "positive"
      },
      {
        title: "Sync Failures",
        value: formatNumber(failedSyncs),
        icon: FiAlertTriangle,
        trend: failedSyncs > 0 ? "↓ 2.2%" : "—",
        trendText: "Failed runs",
        trendType: "negative"
      },
      { title: "Data Sources", value: "3", icon: FiDatabase, trend: "All systems ok", trendType: "positive" },
      { title: "Reports Generated", value: String(reports.length || 0), icon: FiFileText, trend: reports.length > 0 ? "↑ 15.3%" : "—", trendType: "positive" }
    ];
  }, [users, dashboard, reports]);

  return (
    <MainLayout title="Admin" subtitle="Manage users, system syncs, data sources, and reports">
      <div className="admin-page-container">
        
        {/* Navigation Tabs Bar */}
        <nav className="admin-tabs-bar" aria-label="Admin navigation">
          <button type="button" className={`admin-tab-item ${adminTab === "overview" ? "active" : ""}`} onClick={() => setAdminTab("overview")}>Overview</button>
          <button type="button" className={`admin-tab-item ${adminTab === "users" ? "active" : ""}`} onClick={() => setAdminTab("users")}>Users</button>
          <button type="button" className={`admin-tab-item ${adminTab === "sync" ? "active" : ""}`} onClick={() => setAdminTab("sync")}>Sync Management</button>
          <button type="button" className={`admin-tab-item ${adminTab === "sources" ? "active" : ""}`} onClick={() => setAdminTab("sources")}>Data Sources</button>
          <button type="button" className={`admin-tab-item ${adminTab === "reports" ? "active" : ""}`} onClick={() => setAdminTab("reports")}>Reports</button>
          <button type="button" className={`admin-tab-item ${adminTab === "settings" ? "active" : ""}`} onClick={() => setAdminTab("settings")}>System Settings</button>
        </nav>

        {errorMessage && (
          <div className="workspace-notice warning" style={{ marginBottom: 16 }}>
            {errorMessage}
          </div>
        )}

        {/* Toast Notification overlay */}
        {toast && (
          <div className={`papers-toast papers-toast--${toast.type}`}>
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="workspace-empty" style={{ minHeight: 380 }}>
            <span className="workspace-loading-spinner" />
            Loading Admin Workspace…
          </div>
        ) : (
          <div className="admin-content-area">
            
            {/* OVERVIEW TAB: Dashboard mockup grid containing 4 sections */}
            {adminTab === "overview" && (
              <div className="admin-overview-layout">
                
                {/* 6 Stats strip */}
                <div className="admin-stats-strip">
                  {statCards.map((card, i) => (
                    <article key={i} className="admin-stat-card-custom">
                      <div className="card-header">
                        <span className="card-label">{card.title}</span>
                        <div className="card-icon-circle">
                          <card.icon />
                        </div>
                      </div>
                      <h3 className="card-value">{card.value}</h3>
                      <div className="card-footer">
                        <span className={`card-trend ${card.trendType ?? "positive"}`}>{card.trend}</span>
                        {card.trendText && <span className="card-trend-sub"> {card.trendText}</span>}
                      </div>
                    </article>
                  ))}
                </div>

                {/* Mid section grid: User Management summary & Sync Management summary */}
                <div className="admin-overview-mid-row">
                  
                  {/* Left: User Management */}
                  <article className="admin-panel glassmorphic-panel">
                    <div className="panel-header-row">
                      <h3>User Management</h3>
                      <button type="button" className="admin-header-plus-btn" onClick={() => showToast("Mockup: Opened Create User Form", "info")}>
                        <FiPlus />
                        <span>Add User</span>
                      </button>
                    </div>
                    <div className="admin-table-responsive">
                      <table className="admin-compact-table">
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.slice(0, 4).map((u) => (
                            <tr key={u.userId || u.id}>
                              <td><strong>{u.username}</strong></td>
                              <td>{u.email}</td>
                              <td><span className={`role-badge ${(u.role || "").toLowerCase()}`}>{u.role}</span></td>
                              <td><span className="status-dot active" /> Active</td>
                            </tr>
                          ))}
                          {users.length === 0 && (
                            <tr>
                              <td colSpan="4" style={{ textAlign: "center" }}>No users registered.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="admin-view-all-link-btn" onClick={() => setAdminTab("users")}>
                      Manage all users <FiArrowRight />
                    </button>
                  </article>

                  {/* Right: Sync Management */}
                  <article className="admin-panel glassmorphic-panel">
                    <div className="panel-header-row">
                      <h3>Sync Management</h3>
                      <button
                        type="button"
                        className="admin-header-trigger-sync-btn"
                        onClick={handleTriggerSync}
                        disabled={syncing}
                      >
                        <FiRefreshCw className={syncing ? "is-spinning" : ""} />
                        <span>Trigger Manual Sync</span>
                      </button>
                    </div>
                    
                    <div className="admin-sync-summary-strip">
                      <div className="sync-indicator-card ok">
                        <span>Success Rate</span>
                        <strong>99.44%</strong>
                      </div>
                      <div className="sync-indicator-card fail">
                        <span>Failed Syncs</span>
                        <strong>7 runs</strong>
                      </div>
                    </div>

                    <div className="admin-sync-logs-list">
                      {syncLogs.slice(0, 3).map((log, i) => (
                        <div key={log.id ?? i} className="admin-sync-log-row">
                          <span className={`log-bullet ${log.status === "SUCCESS" || log.status === "COMPLETED" ? "success" : "failed"}`} />
                          <div className="log-copy">
                            <h4>{log.status === "SUCCESS" || log.status === "COMPLETED" ? "Data sync completed successfully" : "Scopus data sync failed"}</h4>
                            <p>{log.message ?? `${log.newRecords ?? 0} records indexed`}</p>
                          </div>
                          <span className="log-time">{safeSplitDate(log.startedAt)}</span>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="admin-view-all-link-btn" onClick={() => setAdminTab("sync")}>
                      View all sync logs <FiArrowRight />
                    </button>
                  </article>

                </div>

                {/* Bottom section grid: Data Sources summary & Reports summary */}
                <div className="admin-overview-bottom-row">
                  
                  {/* Left: Data Sources */}
                  <article className="admin-panel glassmorphic-panel">
                    <div className="panel-header-row">
                      <h3>Data Sources</h3>
                      <button type="button" className="admin-header-plus-btn" onClick={() => showToast("Mockup: Add Data Source Panel", "info")}>
                        <FiPlus />
                        <span>Add Data Source</span>
                      </button>
                    </div>
                    <div className="admin-table-responsive">
                      <table className="admin-compact-table">
                        <thead>
                          <tr>
                            <th>Source Name</th>
                            <th>Status</th>
                            <th>Last Sync</th>
                            <th>Records</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sources.map((src) => (
                            <tr key={src.id}>
                              <td><strong>{src.name}</strong></td>
                              <td><span className={`status-label ${src.status.toLowerCase()}`}>{src.status}</span></td>
                              <td>{src.lastSync}</td>
                              <td>{src.records}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  {/* Right: Reports */}
                  <article className="admin-panel glassmorphic-panel">
                    <div className="panel-header-row">
                      <h3>Reports</h3>
                      <button
                        type="button"
                        className="admin-header-plus-btn"
                        onClick={handleCreateReport}
                        disabled={generatingReport}
                      >
                        <FiPlus />
                        <span>{generatingReport ? "Generating..." : "Generate New Report"}</span>
                      </button>
                    </div>
                    <div className="admin-table-responsive">
                      <table className="admin-compact-table">
                        <thead>
                          <tr>
                            <th>Report Name</th>
                            <th>Type</th>
                            <th>Generated On</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.slice(0, 3).map((rep) => (
                            <tr key={rep.id}>
                              <td><strong>{rep.title}</strong></td>
                              <td><span className="report-type-badge">{rep.format}</span></td>
                              <td>{safeSplitDate(rep.period)}</td>
                              <td style={{ textAlign: "right" }}>
                                {rep.downloadUrl && (
                                  <a href={rep.downloadUrl} className="admin-download-btn" target="_blank" rel="noreferrer" title="Download file">
                                    <FiDownload />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                          {reports.length === 0 && (
                            <tr>
                              <td colSpan="4" style={{ textAlign: "center" }}>No reports found. Click generate to start.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" className="admin-view-all-link-btn" onClick={() => setAdminTab("reports")}>
                      View all reports <FiArrowRight />
                    </button>
                  </article>

                </div>

              </div>
            )}

            {/* USERS TAB */}
            {adminTab === "users" && (
              <article className="admin-panel-detailed glassmorphic-panel">
                <div className="panel-header-row">
                  <h3>System User Base ({users.length} accounts)</h3>
                </div>
                <div className="admin-detailed-table-wrap">
                  <table className="admin-detailed-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.userId || u.id}>
                          <td><strong>{u.username}</strong></td>
                          <td>{u.email}</td>
                          <td>
                            <div className="trends-select-wrapper-custom" style={{ display: "inline-flex" }}>
                              <select 
                                value={u.role} 
                                onChange={(e) => handleUpdateRole(u.userId || u.id, e.target.value)}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="LECTURER">LECTURER</option>
                                <option value="STUDENT">STUDENT</option>
                                <option value="RESEARCHER">RESEARCHER</option>
                              </select>
                              <FiChevronDown />
                            </div>
                          </td>
                          <td><span className="status-label connected">Active</span></td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                              type="button" 
                              className="admin-delete-btn" 
                              onClick={() => handleDeleteUser(u.userId || u.id)}
                              style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center" }}>No users registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {/* SYNC TAB */}
            {adminTab === "sync" && (
              <article className="admin-panel-detailed glassmorphic-panel">
                <div className="panel-header-row">
                  <h3>OpenAlex Database Synchronizations</h3>
                  <button
                    type="button"
                    className="admin-header-trigger-sync-btn"
                    onClick={handleTriggerSync}
                    disabled={syncing}
                  >
                    <FiRefreshCw className={syncing ? "is-spinning" : ""} />
                    <span>Sync From OpenAlex Now</span>
                  </button>
                </div>
                <div className="admin-detailed-table-wrap">
                  <table className="admin-detailed-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Synced Records</th>
                        <th>Triggered At</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.map((log, i) => (
                        <tr key={log.id ?? i}>
                          <td>
                            <span className={`status-label ${log.status === "SUCCESS" || log.status === "COMPLETED" ? "connected" : "error"}`}>
                              {log.status}
                            </span>
                          </td>
                          <td><strong>{formatNumber(log.newRecords ?? 0)} records</strong></td>
                          <td>{log.startedAt ? formatDateTime(log.startedAt) : "—"}</td>
                          <td>{log.message || "Manual system check completed."}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {/* SOURCES TAB */}
            {adminTab === "sources" && (
              <article className="admin-panel-detailed glassmorphic-panel">
                <div className="panel-header-row">
                  <h3>Metadata Sources Configuration</h3>
                  <button type="button" className="admin-header-plus-btn" onClick={() => showToast("Mockup: Add Source", "info")}>
                    <FiPlus />
                    <span>Register New Source</span>
                  </button>
                </div>
                <div className="admin-detailed-table-wrap">
                  <table className="admin-detailed-table">
                    <thead>
                      <tr>
                        <th>Source Name</th>
                        <th>Connection Status</th>
                        <th>Last Synchronization Cycle</th>
                        <th>Indexed Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((src) => (
                        <tr key={src.id}>
                          <td><strong>{src.name}</strong></td>
                          <td><span className={`status-label ${src.status.toLowerCase()}`}>{src.status}</span></td>
                          <td>{src.lastSync}</td>
                          <td>{src.records}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {/* REPORTS TAB */}
            {adminTab === "reports" && (
              <article className="admin-panel-detailed glassmorphic-panel">
                <div className="panel-header-row">
                  <h3>Generated Citation & Trend Reports</h3>
                  <button
                    type="button"
                    className="admin-header-plus-btn"
                    onClick={handleCreateReport}
                    disabled={generatingReport}
                  >
                    <FiPlus />
                    <span>{generatingReport ? "Creating..." : "Request New Report"}</span>
                  </button>
                </div>
                <div className="admin-detailed-table-wrap">
                  <table className="admin-detailed-table">
                    <thead>
                      <tr>
                        <th>Report Title</th>
                        <th>Format</th>
                        <th>Description</th>
                        <th>Generated On</th>
                        <th style={{ textAlign: "right" }}>Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((rep) => (
                        <tr key={rep.id}>
                          <td><strong>{rep.title}</strong></td>
                          <td><span className="report-type-badge">{rep.format}</span></td>
                          <td>{rep.description || "Citation analytics summary for active topics."}</td>
                          <td>{rep.period ? formatDateTime(rep.period) : "Recent"}</td>
                          <td style={{ textAlign: "right" }}>
                            {rep.downloadUrl && (
                              <a href={rep.downloadUrl} className="admin-download-btn" target="_blank" rel="noreferrer">
                                <FiDownload />
                                <span>Get File</span>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            )}

            {/* SYSTEM SETTINGS TAB */}
            {adminTab === "settings" && (
              <article className="admin-panel-detailed glassmorphic-panel">
                <div className="panel-header-row">
                  <h3>System Settings & Options</h3>
                </div>
                <div className="admin-settings-mockup-options">
                  <div className="settings-option-item">
                    <div className="settings-option-details">
                      <h4>Automatic Sync Interval</h4>
                      <p>Run OpenAlex catalog synchronization automatically on a cron schedule.</p>
                    </div>
                    <div className="trends-select-wrapper-custom">
                      <select defaultValue="daily">
                        <option value="hourly">Every Hour</option>
                        <option value="daily">Every Day at 12:00 AM</option>
                        <option value="weekly">Every Week (Sunday)</option>
                      </select>
                      <FiChevronDown />
                    </div>
                  </div>
                  <div className="settings-option-item">
                    <div className="settings-option-details">
                      <h4>API Fetch Batch Size</h4>
                      <p>Number of papers to retrieve per request from metadata APIs.</p>
                    </div>
                    <div className="trends-select-wrapper-custom">
                      <select defaultValue="100">
                        <option value="50">50 records</option>
                        <option value="100">100 records</option>
                        <option value="500">500 records</option>
                      </select>
                      <FiChevronDown />
                    </div>
                  </div>
                </div>
              </article>
            )}

          </div>
        )}

      </div>
    </MainLayout>
  );
}

export default AdminPage;
