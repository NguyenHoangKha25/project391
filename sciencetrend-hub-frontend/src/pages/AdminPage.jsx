import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDatabase,
  FiDownload,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import {
  deleteAdminUser,
  getAdminReports,
  getAdminSyncLogs,
  getAdminSystemConfig,
  getAdminUser,
  getAdminUsers,
  triggerAdminBackfill,
  triggerAdminSync,
  updateAdminUserRole,
} from "../services/adminService";
import { getDashboardOverview } from "../services/dashboardService";
import { formatDateTime, formatNumber, normalizeDashboard, normalizeReport, toArray, toObject } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/AdminPage.css";

const tabs = [
  ["overview", "Overview"],
  ["users", "Users"],
  ["sync", "Sync & backfill"],
  ["reports", "All reports"],
  ["settings", "System config"],
];

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_BACKFILL_FROM_YEAR = 2015;

function statusClass(value) {
  return ["SUCCESS", "COMPLETED", "ACTIVE", "CONNECTED"].includes(String(value).toUpperCase()) ? "connected" : "error";
}

function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [config, setConfig] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [fromYear, setFromYear] = useState(String(DEFAULT_BACKFILL_FROM_YEAR));
  const [toYear, setToYear] = useState(String(CURRENT_YEAR));
  const [backfillError, setBackfillError] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const results = await Promise.allSettled([
      getDashboardOverview(),
      getAdminUsers({ page: 0, size: 200 }),
      getAdminSyncLogs({ page: 0, size: 100 }),
      getAdminReports({ page: 0, size: 100 }),
      getAdminSystemConfig(),
    ]);
    const [dashboardResult, usersResult, logsResult, reportsResult, configResult] = results;
    if (dashboardResult.status === "fulfilled") setDashboard(normalizeDashboard(dashboardResult.value));
    if (usersResult.status === "fulfilled") setUsers(toArray(usersResult.value, ["users"]));
    if (logsResult.status === "fulfilled") setSyncLogs(toArray(logsResult.value, ["logs", "syncLogs"]));
    if (reportsResult.status === "fulfilled") setReports(toArray(reportsResult.value, ["reports"]).map(normalizeReport));
    if (configResult.status === "fulfilled") setConfig(toObject(configResult.value));
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed > 0) setMessage(`${failed} admin data source${failed > 1 ? "s" : ""} could not be loaded.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function searchUsers(event) {
    event.preventDefault();
    setWorking("search");
    try {
      const response = await getAdminUsers({ search: userSearch.trim(), page: 0, size: 200 });
      setUsers(toArray(response, ["users"]));
    } catch (error) {
      setMessage(error.message || "Could not search users.");
    } finally {
      setWorking("");
    }
  }

  async function viewUser(userId) {
    setWorking(`user-${userId}`);
    try {
      setSelectedUser(toObject(await getAdminUser(userId)));
    } catch (error) {
      setMessage(error.message || "Could not load this user.");
    } finally {
      setWorking("");
    }
  }

  async function updateRole(userId, role) {
    const previous = users;
    setUsers((current) => current.map((user) => (user.userId ?? user.id) === userId ? { ...user, role } : user));
    try {
      await updateAdminUserRole(userId, role);
    } catch (error) {
      setUsers(previous);
      setMessage(error.message || "Could not update the role.");
    }
  }

  async function removeUser(user) {
    const userId = user.userId ?? user.id;
    if (!window.confirm(`Delete ${user.username || user.email}?`)) return;
    const previous = users;
    setUsers((current) => current.filter((item) => (item.userId ?? item.id) !== userId));
    try {
      await deleteAdminUser(userId);
    } catch (error) {
      setUsers(previous);
      setMessage(error.message || "Could not delete the user.");
    }
  }

  async function runSync() {
    setWorking("sync");
    setMessage("");
    try {
      await triggerAdminSync();
      setMessage("Manual OpenAlex sync was started.");
      await loadAdminData();
    } catch (error) {
      setMessage(error.message || "Could not start sync.");
    } finally {
      setWorking("");
    }
  }

  async function runBackfill(event) {
    event.preventDefault();
    const parsedFromYear = Number(fromYear);
    const parsedToYear = Number(toYear);

    if (!Number.isInteger(parsedFromYear) || !Number.isInteger(parsedToYear)) {
      setBackfillError("Enter a valid start and end year.");
      return;
    }
    if (parsedFromYear < 1900 || parsedToYear > CURRENT_YEAR) {
      setBackfillError(`Choose years between 1900 and ${CURRENT_YEAR}.`);
      return;
    }
    if (parsedFromYear > parsedToYear) {
      setBackfillError("The start year cannot be later than the end year.");
      return;
    }

    setWorking("backfill");
    setMessage("");
    setBackfillError("");
    try {
      await triggerAdminBackfill({ fromYear: parsedFromYear, toYear: parsedToYear });
      await loadAdminData();
      setMessage(`Historical backfill ${parsedFromYear}–${parsedToYear} completed successfully.`);
    } catch (error) {
      setMessage(error.message || "Could not start backfill.");
    } finally {
      setWorking("");
    }
  }

  const activeUsers = useMemo(
    () => users.filter((user) => !user.status || String(user.status).toUpperCase() === "ACTIVE").length,
    [users],
  );
  const stats = [
    { label: "Total users", value: users.length, icon: FiUsers },
    { label: "Active users", value: activeUsers, icon: FiCheckCircle },
    { label: "Successful syncs", value: dashboard?.successfulSyncs ?? 0, icon: FiDatabase },
    { label: "Failed syncs", value: dashboard?.failedSyncs ?? 0, icon: FiAlertTriangle },
    { label: "All reports", value: reports.length, icon: FiFileText },
    { label: "Config entries", value: Object.keys(config).length, icon: FiSettings },
  ];

  return (
    <MainLayout title="Admin" subtitle="Manage users, OpenAlex synchronization and system data">
      <section className="workspace-page admin-page-container">
        <nav className="admin-tabs-bar" aria-label="Admin navigation">
          {tabs.map(([value, label]) => <button key={value} type="button" className={`admin-tab-item ${tab === value ? "active" : ""}`} onClick={() => setTab(value)}>{label}</button>)}
        </nav>
        {message && <div className="workspace-notice info admin-message">{message}<button type="button" onClick={() => setMessage("")} aria-label="Dismiss"><FiX /></button></div>}

        {loading ? <div className="workspace-empty"><span className="workspace-loading-spinner" />Loading admin data…</div> : (
          <>
            {tab === "overview" && (
              <div className="admin-overview-layout">
                <div className="admin-stats-strip">
                  {stats.map(({ label, value, icon: Icon }) => (
                    <article className="admin-stat-card-custom" key={label}>
                      <div className="card-header"><span className="card-label">{label}</span><span className="card-icon-circle"><Icon /></span></div>
                      <h3 className="card-value">{formatNumber(value)}</h3>
                      <div className="card-footer"><span className="card-trend-sub">Live backend data</span></div>
                    </article>
                  ))}
                </div>
                <div className="admin-overview-mid-row">
                  <article className="admin-panel">
                    <div className="panel-header-row"><h3>Recent users</h3><button className="admin-view-all-link-btn" type="button" onClick={() => setTab("users")}>Manage users</button></div>
                    <AdminUsersTable users={users.slice(0, 5)} onView={viewUser} onRole={updateRole} onDelete={removeUser} working={working} compact />
                  </article>
                  <article className="admin-panel">
                    <div className="panel-header-row"><h3>Latest sync runs</h3><div className="admin-sync-actions"><button className="admin-secondary-action-btn" type="button" onClick={() => setTab("sync")}><FiDatabase /> Backfill years</button><button className="admin-header-trigger-sync-btn" type="button" onClick={runSync} disabled={working === "sync"}><FiRefreshCw className={working === "sync" ? "is-spinning" : ""} /> Sync now</button></div></div>
                    <SyncTable logs={syncLogs.slice(0, 5)} compact />
                  </article>
                </div>
              </div>
            )}

            {tab === "users" && (
              <article className="admin-panel-detailed">
                <div className="panel-header-row"><h3>User management</h3><form className="admin-search-form" onSubmit={searchUsers}><FiSearch /><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search username or email" /><button type="submit" disabled={working === "search"}>Search</button></form></div>
                <AdminUsersTable users={users} onView={viewUser} onRole={updateRole} onDelete={removeUser} working={working} />
              </article>
            )}

            {tab === "sync" && (
              <div className="admin-sync-layout">
                <article className="admin-panel-detailed">
                  <div className="panel-header-row"><div><h3>OpenAlex synchronization</h3><p>Start a current sync or backfill a historical year range.</p></div><button className="admin-header-trigger-sync-btn" type="button" onClick={runSync} disabled={working === "sync"}><FiRefreshCw className={working === "sync" ? "is-spinning" : ""} /> Manual sync</button></div>
                  <form className="admin-backfill-form" onSubmit={runBackfill}>
                    <div className="admin-backfill-copy"><span>Historical data</span><strong>Backfill publications by year</strong><p>Import missing OpenAlex records for the selected period.</p></div>
                    <div className="admin-backfill-fields">
                      <label htmlFor="backfill-from-year">From year<input id="backfill-from-year" type="number" min="1900" max={CURRENT_YEAR} value={fromYear} onChange={(event) => { setFromYear(event.target.value); setBackfillError(""); }} disabled={working === "backfill"} required /></label>
                      <span className="admin-year-separator" aria-hidden="true">to</span>
                      <label htmlFor="backfill-to-year">To year<input id="backfill-to-year" type="number" min="1900" max={CURRENT_YEAR} value={toYear} onChange={(event) => { setToYear(event.target.value); setBackfillError(""); }} disabled={working === "backfill"} required /></label>
                    </div>
                    <button className="workspace-button primary admin-backfill-submit" type="submit" disabled={working === "backfill"}>{working === "backfill" ? <><FiRefreshCw className="is-spinning" /> Starting backfill…</> : <><FiDownload /> Start backfill</>}</button>
                    {backfillError && <p className="admin-backfill-error" role="alert"><FiAlertTriangle /> {backfillError}</p>}
                  </form>
                </article>
                <article className="admin-panel-detailed"><div className="panel-header-row"><h3>Sync history</h3></div><SyncTable logs={syncLogs} /></article>
              </div>
            )}

            {tab === "reports" && (
              <article className="admin-panel-detailed"><div className="panel-header-row"><h3>Reports from all users</h3><span>{reports.length} reports</span></div><ReportsTable reports={reports} /></article>
            )}

            {tab === "settings" && (
              <article className="admin-panel-detailed"><div className="panel-header-row"><div><h3>Current system configuration</h3><p>Read-only values returned by the backend.</p></div><button type="button" className="workspace-button" onClick={loadAdminData}><FiRefreshCw /> Refresh</button></div><ConfigGrid config={config} /></article>
            )}
          </>
        )}

        {selectedUser && <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />}
      </section>
    </MainLayout>
  );
}

function AdminUsersTable({ users, onView, onRole, onDelete, working, compact = false }) {
  return <div className="admin-detailed-table-wrap"><table className={compact ? "admin-compact-table" : "admin-detailed-table"}><thead><tr><th>User</th><th>Email</th><th>Role</th>{!compact && <th>Status</th>}<th>Actions</th></tr></thead><tbody>{users.map((user) => { const id = user.userId ?? user.id; return <tr key={id}><td><strong>{user.username || user.fullName || "Unnamed user"}</strong></td><td>{user.email || "—"}</td><td><select value={user.role || "STUDENT"} onChange={(event) => onRole(id, event.target.value)}><option>STUDENT</option><option>LECTURER</option><option>RESEARCHER</option><option>ADMIN</option></select></td>{!compact && <td><span className={`status-label ${statusClass(user.status || "ACTIVE")}`}>{user.status || "ACTIVE"}</span></td>}<td><div className="admin-row-actions"><button type="button" onClick={() => onView(id)} disabled={working === `user-${id}`} aria-label="View user"><FiEye /></button><button type="button" className="danger" onClick={() => onDelete(user)} aria-label="Delete user"><FiTrash2 /></button></div></td></tr>; })}{users.length === 0 && <tr><td colSpan="5">No users found.</td></tr>}</tbody></table></div>;
}

function SyncTable({ logs, compact = false }) {
  return <div className="admin-detailed-table-wrap"><table className={compact ? "admin-compact-table" : "admin-detailed-table"}><thead><tr><th>Status</th><th>Records</th><th>Started</th>{!compact && <th>Details</th>}</tr></thead><tbody>{logs.map((log, index) => <tr key={log.id ?? index}><td><span className={`status-label ${statusClass(log.status)}`}>{log.status || "UNKNOWN"}</span></td><td>{formatNumber(log.paperSynced ?? log.newRecords ?? log.recordsIndexed ?? 0)}</td><td>{log.startedAt ? formatDateTime(log.startedAt) : "—"}</td>{!compact && <td>{log.message || "—"}</td>}</tr>)}{logs.length === 0 && <tr><td colSpan="4">No sync logs available.</td></tr>}</tbody></table></div>;
}

function ReportsTable({ reports }) {
  return <div className="admin-detailed-table-wrap"><table className="admin-detailed-table"><thead><tr><th>Report</th><th>Owner</th><th>Status</th><th>Generated</th><th>File</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><strong>{report.title}</strong></td><td>{report.ownerName || report.username || report.email || "—"}</td><td><span className="workspace-status">{report.status}</span></td><td>{report.period ? formatDateTime(report.period) : "—"}</td><td>{report.downloadUrl ? <a className="admin-download-btn" href={report.downloadUrl} target="_blank" rel="noreferrer"><FiDownload /> Download</a> : "—"}</td></tr>)}{reports.length === 0 && <tr><td colSpan="5">No reports available.</td></tr>}</tbody></table></div>;
}

function ConfigGrid({ config }) {
  const entries = Object.entries(config);
  if (entries.length === 0) return <div className="workspace-empty">No configuration values were returned.</div>;
  return <dl className="admin-config-grid">{entries.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1").replace(/[_.-]+/g, " ")}</dt><dd>{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>;
}

function UserDetail({ user, onClose }) {
  return <div className="admin-user-backdrop" onClick={onClose}><aside className="admin-user-detail" onClick={(event) => event.stopPropagation()}><button type="button" onClick={onClose} aria-label="Close"><FiX /></button><span className="catalog-kicker">User details</span><h2>{user.username || user.fullName || user.email}</h2><dl>{Object.entries(user).filter(([, value]) => value !== null && typeof value !== "object").map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></aside></div>;
}

export default AdminPage;
