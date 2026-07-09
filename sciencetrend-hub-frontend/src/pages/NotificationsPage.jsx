import { useCallback, useEffect, useState } from "react";
import { FiBell, FiBookOpen, FiFileText, FiTrendingUp } from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";
import { formatRelativeTime, normalizeNotification, toArray } from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/NotificationsPage.css";

function getNotificationIcon(type = "") {
  const t = String(type).toLowerCase();
  if (t.includes("journal")) return FiBookOpen;
  if (t.includes("trend") || t.includes("topic")) return FiTrendingUp;
  if (t.includes("paper") || t.includes("publication")) return FiFileText;
  return FiBell;
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await getNotifications();
      setNotifications(toArray(response, ["notifications"]).map(normalizeNotification));
    } catch (error) {
      console.error("Cannot load notifications", error);
      setNotifications([]);
      // Don't block page for 500 — show empty state instead
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((item) => item.unread).length;

  async function handleMarkAllAsRead() {
    const oldNotifications = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error("Cannot mark all notifications as read", error);
      setNotifications(oldNotifications);
      setErrorMessage("Couldn't mark notifications as read. Please try again.");
    }
  }

  async function handleOpenNotification(notificationId) {
    const target = notifications.find((item) => item.id === notificationId);
    if (!target || !target.unread) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, unread: false } : item
      )
    );

    try {
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Cannot mark notification as read", error);
    }
  }

  return (
    <MainLayout
      title="Notifications"
      subtitle="Review updates from papers, journals and tracked topics"
    >
      <section className="workspace-page notifications-page">
        <div className="workspace-toolbar">
          <div className="workspace-toolbar-copy">
            <h2>Recent notifications</h2>
            <p>
              {loading
                ? "Checking for updates…"
                : unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount !== 1 ? "s" : ""}.`
                  : "You're all caught up."}
            </p>
          </div>

          <button
            type="button"
            className="workspace-button"
            onClick={handleMarkAllAsRead}
            disabled={loading || unreadCount === 0}
          >
            <FiBell /> Mark all read
          </button>
        </div>

        {!loading && errorMessage && (
          <div className="workspace-notice warning" style={{ marginBottom: 14 }}>
            {errorMessage}
          </div>
        )}

        <article className="workspace-panel">
          {loading ? (
            <div className="workspace-empty">Loading notifications…</div>
          ) : notifications.length > 0 ? (
            <div className="workspace-list">
              {notifications.map((item) => {
                const Icon = getNotificationIcon(item.type);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`workspace-notification ${item.unread ? "unread" : ""}`}
                    onClick={() => handleOpenNotification(item.id)}
                  >
                    <span className="workspace-notification-icon">
                      <Icon />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.message}</p>
                    </div>
                    <time>{formatRelativeTime(item.time)}</time>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="workspace-empty">
              No notifications yet. You'll get updates here when papers sync, trends shift, or journals are tracked.
            </div>
          )}
        </article>
      </section>
    </MainLayout>
  );
}

export default NotificationsPage;
