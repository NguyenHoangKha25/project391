import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookmark,
  FiBookOpen,
  FiBell,
  FiFileText,
  FiTrash2,
  FiExternalLink,
  FiTag,
  FiFolder,
  FiArrowRight,
  FiSettings,
  FiCheckCircle,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import PaperCard from "../components/PaperCard";
import JournalCard from "../components/JournalCard";
import TopicCard from "../components/TopicCard";
import {
  getBookmarkedPapers,
  getBookmarkedKeywords,
  removeBookmarkByPaperId,
  removeKeywordBookmark,
} from "../services/bookmarkService";
import { getFollowedJournals, unfollowJournal } from "../services/journalService";
import { getFollowedTopics, unfollowTopic } from "../services/topicService";
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
} from "../services/notificationService";
import {
  normalizePaper,
  normalizeJournal,
  normalizeTopic,
  normalizeNotification,
  toArray,
  formatDateTime,
} from "../utils/apiData";
import "../styles/WorkspacePages.css";
import "../styles/BookmarksPage.css";

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

function BookmarksPage() {
  // Tab states: 'overview' | 'papers' | 'keywords' | 'journals' | 'topics' | 'notifications'
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [savedPapers, setSavedPapers] = useState([]);
  const [savedKeywords, setSavedKeywords] = useState([]);
  const [followedJournals, setFollowedJournals] = useState([]);
  const [followedTopics, setFollowedTopics] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast, showToast } = useToast();

  const loadLibraryData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [papersRes, keywordsRes, journalsRes, topicsRes, notifsRes] = await Promise.allSettled([
        getBookmarkedPapers(),
        getBookmarkedKeywords(),
        getFollowedJournals(),
        getFollowedTopics(),
        getNotifications(),
      ]);

      setSavedPapers(
        papersRes.status === "fulfilled"
          ? toArray(papersRes.value).map(normalizePaper)
          : []
      );
      setSavedKeywords(
        keywordsRes.status === "fulfilled"
          ? toArray(keywordsRes.value).map((kw, i) => ({
              id: kw.keywordId ?? kw.id ?? i,
              name: kw.name ?? kw.keyword ?? String(kw),
            }))
          : []
      );
      setFollowedJournals(
        journalsRes.status === "fulfilled"
          ? toArray(journalsRes.value).map(normalizeJournal)
          : []
      );
      setFollowedTopics(
        topicsRes.status === "fulfilled"
          ? toArray(topicsRes.value).map(normalizeTopic)
          : []
      );
      setNotifications(
        notifsRes.status === "fulfilled"
          ? toArray(notifsRes.value).map(normalizeNotification)
          : []
      );
    } catch (err) {
      console.error("Cannot load library data", err);
      setErrorMessage("Could not load library. The backend server might be offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraryData();
  }, [loadLibraryData]);

  // Unsave actions
  async function handleRemoveSavedPaper(paperId) {
    const oldPapers = savedPapers;
    setSavedPapers((curr) => curr.filter((p) => p.id !== paperId));
    try {
      await removeBookmarkByPaperId(paperId);
      showToast("Removed paper from bookmarks.", "info");
    } catch {
      setSavedPapers(oldPapers);
      showToast("Couldn't remove paper. Try again.", "warning");
    }
  }

  async function handleRemoveKeyword(keywordId) {
    const oldKeywords = savedKeywords;
    setSavedKeywords((curr) => curr.filter((kw) => kw.id !== keywordId));
    try {
      await removeKeywordBookmark(keywordId);
      showToast("Removed keyword from bookmarks.", "info");
    } catch {
      setSavedKeywords(oldKeywords);
      showToast("Couldn't remove keyword. Try again.", "warning");
    }
  }

  async function handleUnfollowJournal(journalId) {
    const oldJournals = followedJournals;
    setFollowedJournals((curr) => curr.filter((j) => j.id !== journalId));
    try {
      await unfollowJournal(journalId);
      showToast("Untracked journal.", "info");
    } catch {
      setFollowedJournals(oldJournals);
      showToast("Couldn't untrack journal. Try again.", "warning");
    }
  }

  async function handleUnfollowTopic(topicId) {
    const oldTopics = followedTopics;
    setFollowedTopics((curr) => curr.filter((t) => t.id !== topicId));
    try {
      await unfollowTopic(topicId);
      showToast("Untracked topic.", "info");
    } catch {
      setFollowedTopics(oldTopics);
      showToast("Couldn't untrack topic. Try again.", "warning");
    }
  }

  // Notification actions
  async function handleMarkRead(notifId) {
    setNotifications((curr) =>
      curr.map((n) => (n.id === notifId ? { ...n, unread: false } : n))
    );
    try {
      await markNotificationAsRead(notifId);
    } catch {
      // Quiet fail to avoid interrupting user flow
    }
  }

  async function handleMarkAllRead() {
    setNotifications((curr) => curr.map((n) => ({ ...n, unread: false })));
    try {
      await markAllNotificationsAsRead();
      showToast("All notifications marked as read.", "success");
    } catch {
      showToast("Couldn't mark all read. Try again.", "warning");
    }
  }

  async function handleDeleteNotification(notifId) {
    setNotifications((curr) => curr.filter((n) => n.id !== notifId));
    try {
      await deleteNotification(notifId);
    } catch {
      // Quiet fail
    }
  }

  const unreadNotifsCount = notifications.filter((n) => n.unread).length;

  return (
    <MainLayout title="My Library" subtitle="Your saved papers, followed content, and notifications">
      <div className="library-container">
        
        {/* Navigation Tabs Bar */}
        <nav className="library-tabs-bar" aria-label="Library navigation">
          <button
            type="button"
            className={`lib-tab-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={`lib-tab-item ${activeTab === "papers" ? "active" : ""}`}
            onClick={() => setActiveTab("papers")}
          >
            Bookmarked Papers <span className="lib-tab-badge">{savedPapers.length}</span>
          </button>
          <button
            type="button"
            className={`lib-tab-item ${activeTab === "keywords" ? "active" : ""}`}
            onClick={() => setActiveTab("keywords")}
          >
            Saved Keywords <span className="lib-tab-badge">{savedKeywords.length}</span>
          </button>
          <button
            type="button"
            className={`lib-tab-item ${activeTab === "journals" ? "active" : ""}`}
            onClick={() => setActiveTab("journals")}
          >
            Following Journals <span className="lib-tab-badge">{followedJournals.length}</span>
          </button>
          <button
            type="button"
            className={`lib-tab-item ${activeTab === "topics" ? "active" : ""}`}
            onClick={() => setActiveTab("topics")}
          >
            Following Topics <span className="lib-tab-badge">{followedTopics.length}</span>
          </button>
          <button
            type="button"
            className={`lib-tab-item ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifications <span className="lib-tab-badge">{unreadNotifsCount}</span>
          </button>
        </nav>

        {/* Error notification */}
        {errorMessage && (
          <div className="workspace-notice warning" style={{ marginBottom: 20 }}>
            {errorMessage}
          </div>
        )}

        {/* Toast Overlay */}
        {toast && (
          <div className={`papers-toast papers-toast--${toast.type}`}>
            {toast.message}
          </div>
        )}

        {loading ? (
          <div className="workspace-empty" style={{ minHeight: 380 }}>
            <span className="workspace-loading-spinner" />
            Loading Library Workspace…
          </div>
        ) : (
          <div className="library-content-area">
            
            {/* OVERVIEW TAB: Split panel design matching mockup screenshot */}
            {activeTab === "overview" && (
              <div className="lib-overview-layout">
                
                {/* Mid section split: Saved Papers & Notifications */}
                <div className="lib-overview-mid-row">
                  
                  {/* Left panel: Bookmarked Papers */}
                  <article className="lib-overview-panel">
                    <div className="lib-panel-header">
                      <h3>Bookmarked Papers</h3>
                      <button type="button" className="lib-tab-link" onClick={() => setActiveTab("papers")}>
                        View all bookmarked papers <FiArrowRight />
                      </button>
                    </div>
                    <div className="lib-scroll-list">
                      {savedPapers.slice(0, 4).map((paper) => (
                        <div key={paper.id} className="lib-item-row-compact">
                          <FiBookmark className="lib-item-icon-saved" />
                          <div className="lib-item-details">
                            <h4>{paper.title}</h4>
                            <p>{paper.authors} · {paper.year} · {paper.source}</p>
                          </div>
                          <button
                            type="button"
                            className="lib-item-delete"
                            onClick={() => handleRemoveSavedPaper(paper.id)}
                            title="Remove bookmark"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                      {savedPapers.length === 0 && (
                        <div className="lib-empty-state">No saved papers yet.</div>
                      )}
                    </div>
                  </article>

                  {/* Right panel: Notifications panel */}
                  <article className="lib-overview-panel">
                    <div className="lib-panel-header">
                      <h3>Notifications</h3>
                      <div className="lib-header-actions">
                        {unreadNotifsCount > 0 && (
                          <button type="button" className="lib-action-text-btn" onClick={handleMarkAllRead}>
                            <FiCheckCircle /> Mark all read
                          </button>
                        )}
                        <button type="button" className="lib-tab-link" onClick={() => setActiveTab("notifications")}>
                          View all notifications <FiArrowRight />
                        </button>
                      </div>
                    </div>
                    <div className="lib-scroll-list">
                      {notifications.slice(0, 4).map((notif) => (
                        <div
                          key={notif.id}
                          className={`lib-notif-row ${notif.unread ? "unread" : ""}`}
                          onClick={() => handleMarkRead(notif.id)}
                        >
                          <span className={`lib-notif-status ${notif.unread ? "active" : ""}`} />
                          <div className="lib-notif-body">
                            <h4>{notif.title}</h4>
                            <p>{notif.message}</p>
                            <small>{formatDateTime(notif.time)}</small>
                          </div>
                          <button
                            type="button"
                            className="lib-item-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notif.id);
                            }}
                            title="Delete notification"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="lib-empty-state">No notifications.</div>
                      )}
                    </div>
                  </article>

                </div>

                {/* Bottom section split: Following Journals & Following Topics */}
                <div className="lib-overview-bottom-row">
                  
                  {/* Left bottom panel: Following Journals grid */}
                  <article className="lib-overview-panel">
                    <div className="lib-panel-header">
                      <h3>Following Journals</h3>
                      <button type="button" className="lib-tab-link" onClick={() => setActiveTab("journals")}>
                        View all followed journals <FiArrowRight />
                      </button>
                    </div>
                    <div className="lib-horizontal-grid">
                      {followedJournals.slice(0, 4).map((journal) => (
                        <div key={journal.id} className="lib-horizontal-card">
                          <div className="lib-card-icon-box bg-teal">
                            <FiBookOpen />
                          </div>
                          <div className="lib-card-copy">
                            <h4>{journal.name}</h4>
                            <p>{journal.publisher}</p>
                          </div>
                          <button
                            type="button"
                            className="lib-card-untrack"
                            onClick={() => handleUnfollowJournal(journal.id)}
                          >
                            Untrack
                          </button>
                        </div>
                      ))}
                      {followedJournals.length > 4 && (
                        <button type="button" className="lib-horizontal-card-more" onClick={() => setActiveTab("journals")}>
                          <strong>+{followedJournals.length - 4}</strong>
                          <span>more journals</span>
                        </button>
                      )}
                      {followedJournals.length === 0 && (
                        <div className="lib-empty-state">Not tracking any journals yet.</div>
                      )}
                    </div>
                  </article>

                  {/* Right bottom panel: Following Topics grid */}
                  <article className="lib-overview-panel">
                    <div className="lib-panel-header">
                      <h3>Following Topics</h3>
                      <button type="button" className="lib-tab-link" onClick={() => setActiveTab("topics")}>
                        View all followed topics <FiArrowRight />
                      </button>
                    </div>
                    <div className="lib-horizontal-grid">
                      {followedTopics.slice(0, 4).map((topic) => (
                        <div key={topic.id} className="lib-horizontal-card">
                          <div className="lib-card-icon-box bg-purple">
                            <FiTag />
                          </div>
                          <div className="lib-card-copy">
                            <h4>{topic.name}</h4>
                            <p>{topic.paperCount}</p>
                          </div>
                          <button
                            type="button"
                            className="lib-card-untrack"
                            onClick={() => handleUnfollowTopic(topic.id)}
                          >
                            Untrack
                          </button>
                        </div>
                      ))}
                      {followedTopics.length > 4 && (
                        <button type="button" className="lib-horizontal-card-more" onClick={() => setActiveTab("topics")}>
                          <strong>+{followedTopics.length - 4}</strong>
                          <span>more topics</span>
                        </button>
                      )}
                      {followedTopics.length === 0 && (
                        <div className="lib-empty-state">Not following any topics yet.</div>
                      )}
                    </div>
                  </article>

                </div>

              </div>
            )}

            {/* PAPERS TAB: Render full lists of Bookmarked Papers */}
            {activeTab === "papers" && (
              <div className="lib-detailed-list-section">
                <div className="detailed-section-title">
                  <h3>Saved Research Papers ({savedPapers.length})</h3>
                  <Link to="/papers" className="lib-action-btn-main">
                    Browse Papers
                  </Link>
                </div>
                <div className="lib-papers-layout-list">
                  {savedPapers.map((paper) => (
                    <PaperCard
                      key={paper.id}
                      {...paper}
                      saved
                      onBookmark={() => handleRemoveSavedPaper(paper.id)}
                    />
                  ))}
                  {savedPapers.length === 0 && (
                    <div className="lib-detailed-empty">
                      Your bookmark folder is empty. Browse indexed publications on the Search Papers page and save them.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KEYWORDS TAB: List of Saved Keywords */}
            {activeTab === "keywords" && (
              <div className="lib-detailed-list-section">
                <div className="detailed-section-title">
                  <h3>Saved Search Keywords ({savedKeywords.length})</h3>
                </div>
                <div className="lib-keywords-badge-grid">
                  {savedKeywords.map((kw) => (
                    <div key={kw.id} className="lib-keyword-badge-card">
                      <FiTag />
                      <span>{kw.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw.id)}
                        title="Remove keyword"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                  {savedKeywords.length === 0 && (
                    <div className="lib-detailed-empty" style={{ width: "100%" }}>
                      No keywords saved yet. Bookmark keywords on trends page to follow them.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* JOURNALS TAB: List of followed journals */}
            {activeTab === "journals" && (
              <div className="lib-detailed-list-section">
                <div className="detailed-section-title">
                  <h3>Following Journals ({followedJournals.length})</h3>
                </div>
                <div className="lib-journals-list-grid">
                  {followedJournals.map((journal) => (
                    <JournalCard
                      key={journal.id}
                      {...journal}
                      onUnfollow={() => handleUnfollowJournal(journal.id)}
                    />
                  ))}
                  {followedJournals.length === 0 && (
                    <div className="lib-detailed-empty" style={{ width: "100%" }}>
                      No followed journals. Start tracking journals to see them here.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TOPICS TAB: List of followed topics */}
            {activeTab === "topics" && (
              <div className="lib-detailed-list-section">
                <div className="detailed-section-title">
                  <h3>Following Topics ({followedTopics.length})</h3>
                </div>
                <div className="lib-topics-list-grid">
                  {followedTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      {...topic}
                      onUnfollow={() => handleUnfollowTopic(topic.id)}
                    />
                  ))}
                  {followedTopics.length === 0 && (
                    <div className="lib-detailed-empty" style={{ width: "100%" }}>
                      No followed topics. Select topics on search page to trace them.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB: Full screen notifications dashboard */}
            {activeTab === "notifications" && (
              <div className="lib-detailed-list-section">
                <div className="detailed-section-title">
                  <h3>System Notifications ({notifications.length})</h3>
                  {unreadNotifsCount > 0 && (
                    <button type="button" className="lib-action-btn-main secondary" onClick={handleMarkAllRead}>
                      Mark All as Read
                    </button>
                  )}
                </div>
                <div className="lib-notifications-detailed-list">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`lib-notif-detail-card ${notif.unread ? "unread" : ""}`}
                      onClick={() => handleMarkRead(notif.id)}
                    >
                      <div className="notif-detail-header">
                        <div className="notif-detail-title-box">
                          <span className={`unread-indicator ${notif.unread ? "active" : ""}`} />
                          <h4>{notif.title}</h4>
                        </div>
                        <span className="notif-detail-time">{formatDateTime(notif.time)}</span>
                      </div>
                      <p className="notif-detail-message">{notif.message}</p>
                      <div className="notif-detail-actions">
                        <button
                          type="button"
                          className="notif-detail-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notif.id);
                          }}
                        >
                          <FiTrash2 />
                          <span>Delete log</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="lib-detailed-empty">
                      You have no notifications. Sync cycles will trigger alerts when finished.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </MainLayout>
  );
}

export default BookmarksPage;
