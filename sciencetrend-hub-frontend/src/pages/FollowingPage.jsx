import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookOpen,
  FiTag,
  FiTrash2,
  FiExternalLink,
  FiSearch,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { getFollowedTopics, unfollowTopic } from "../services/topicService";
import { getFollowedJournals, unfollowJournal } from "../services/journalService";
import { normalizeTopic, normalizeJournal, toArray } from "../utils/apiData";
import { getCachedData, setCachedData } from "../utils/apiCache";
import { ROUTE_PATHS } from "../routes/routePaths";
import { useAuth } from "../context/useAuth";
import "../styles/WorkspacePages.css";
import "../styles/FollowingPage.css";

/* ── Toast Overlay Hook ── */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  return { toast, showToast };
}

function hasNumericId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function getTopicShortcut(topic) {
  return hasNumericId(topic.id)
    ? ROUTE_PATHS.topicDetail(topic.id, topic.name)
    : ROUTE_PATHS.topicPapers(topic.name);
}

function getJournalShortcut(journal) {
  return hasNumericId(journal.id)
    ? ROUTE_PATHS.journalDetail(journal.id, journal.name)
    : ROUTE_PATHS.journalPapers(journal.name);
}

function FollowingPage() {
  const { user } = useAuth();
  const cacheOwner = user?.userId ?? user?.id ?? user?.email ?? user?.username ?? "current";
  const followingCacheKey = `following_data_${cacheOwner}`;
  const [activeTab, setActiveTab] = useState("topics"); // 'topics' | 'journals'
  
  const [followedTopics, setFollowedTopics] = useState([]);
  const [followedJournals, setFollowedJournals] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState("");
  const [unfollowProcessing, setUnfollowProcessing] = useState(new Set());

  const { toast, showToast } = useToast();

  const loadData = useCallback(async () => {
    const cacheKey = followingCacheKey;
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
      setFollowedTopics(cachedData.followedTopics);
      setFollowedJournals(cachedData.followedJournals);
      setLoading(false);

      // Perform a silent background validation to refresh cache seamlessly
      Promise.allSettled([
        getFollowedTopics(),
        getFollowedJournals(),
      ]).then(([topicsRes, journalsRes]) => {
        const freshData = {
          followedTopics: topicsRes.status === "fulfilled" ? toArray(topicsRes.value).map(t => normalizeTopic(t)) : cachedData.followedTopics,
          followedJournals: journalsRes.status === "fulfilled" ? toArray(journalsRes.value).map(j => normalizeJournal(j)) : cachedData.followedJournals
        };
        setFollowedTopics(freshData.followedTopics);
        setFollowedJournals(freshData.followedJournals);
        setCachedData(cacheKey, freshData);
      });
      return;
    }

    try {
      setLoading(true);
      const [topicsRes, journalsRes] = await Promise.allSettled([
        getFollowedTopics(),
        getFollowedJournals(),
      ]);
      if (topicsRes.status === "rejected" && journalsRes.status === "rejected") {
        showToast("Failed to load followed content.", "warning");
      }

      const freshData = {
        followedTopics: topicsRes.status === "fulfilled" ? toArray(topicsRes.value).map(t => normalizeTopic(t)) : [],
        followedJournals: journalsRes.status === "fulfilled" ? toArray(journalsRes.value).map(j => normalizeJournal(j)) : []
      };

      setFollowedTopics(freshData.followedTopics);
      setFollowedJournals(freshData.followedJournals);
      setCachedData(cacheKey, freshData);
    } catch {
      showToast("Failed to load followed content.", "warning");
    } finally {
      setLoading(false);
    }
  }, [followingCacheKey, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unfollow topic
  async function handleUnfollowTopic(topicId, topicName) {
    if (unfollowProcessing.has(`topic-${topicId}`)) return;

    setUnfollowProcessing((prev) => {
      const next = new Set(prev);
      next.add(`topic-${topicId}`);
      return next;
    });

    try {
      await unfollowTopic(topicId);
      setFollowedTopics((prev) => prev.filter((t) => String(t.id) !== String(topicId)));
      showToast(`Unfollowed topic: ${topicName}`, "success");
    } catch (err) {
      showToast(err.message || "Failed to unfollow topic", "warning");
    } finally {
      setUnfollowProcessing((prev) => {
        const next = new Set(prev);
        next.delete(`topic-${topicId}`);
        return next;
      });
    }
  }

  // Unfollow journal
  async function handleUnfollowJournal(journalId, journalName) {
    if (unfollowProcessing.has(`journal-${journalId}`)) return;

    setUnfollowProcessing((prev) => {
      const next = new Set(prev);
      next.add(`journal-${journalId}`);
      return next;
    });

    try {
      await unfollowJournal(journalId);
      setFollowedJournals((prev) => prev.filter((j) => String(j.id) !== String(journalId)));
      showToast(`Unfollowed journal: ${journalName}`, "success");
    } catch (err) {
      showToast(err.message || "Failed to untrack journal", "warning");
    } finally {
      setUnfollowProcessing((prev) => {
        const next = new Set(prev);
        next.delete(`journal-${journalId}`);
        return next;
      });
    }
  }

  // Filter content based on search query
  const filteredTopics = followedTopics.filter((t) =>
    t.name.toLowerCase().includes(searchVal.toLowerCase())
  );

  const filteredJournals = followedJournals.filter((j) =>
    j.name.toLowerCase().includes(searchVal.toLowerCase()) ||
    j.publisher.toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <MainLayout
      title="Following Manager"
      subtitle="View and manage all topics and academic journals you are tracking"
    >
      {toast && (
        <div className={`st-toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="workspace-page following-page-container">
        
        {/* Toolbar with tab switcher and search */}
        <div className="following-toolbar">
          <div className="following-tabs" role="tablist" aria-label="Following categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "topics"}
              className={`following-tab-btn ${activeTab === "topics" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("topics");
                setSearchVal("");
              }}
            >
              <FiTag />
              <span>Topics</span>
              <span className="tab-badge">{followedTopics.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "journals"}
              className={`following-tab-btn ${activeTab === "journals" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("journals");
                setSearchVal("");
              }}
            >
              <FiBookOpen />
              <span>Journals</span>
              <span className="tab-badge">{followedJournals.length}</span>
            </button>
          </div>

          <div className="following-search-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder={`Filter followed ${activeTab}...`}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="following-search-input"
            />
            {searchVal && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchVal("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Dynamic List */}
        {loading ? (
          <div className="following-loading-state page-loading-state"><span className="workspace-loading-spinner" />Loading your followed items...</div>
        ) : activeTab === "topics" ? (
          /* TOPICS TAB */
          filteredTopics.length > 0 ? (
            <div className="following-grid">
              {filteredTopics.map((topic) => {
                const processing = unfollowProcessing.has(`topic-${topic.id}`);

                return (
                  <article key={`topic-${topic.id}`} className="followed-item-card topic-card">
                    <Link className="card-left followed-item-shortcut" to={getTopicShortcut(topic)} title={`Open ${topic.name}`}>
                      <div className="card-icon topic-icon">
                        <FiTag />
                      </div>
                      <div className="card-info">
                        <h3>{topic.name}</h3>
                        <p>{topic.paperCount}</p>
                      </div>
                      <FiExternalLink className="followed-shortcut-icon" />
                    </Link>

                    <div className="card-right">
                      <Link to={getTopicShortcut(topic)} className="action-link-btn" title="View details">
                        View <FiExternalLink />
                      </Link>
                      <button
                        type="button"
                        className="unfollow-action-btn"
                        onClick={() => handleUnfollowTopic(topic.id, topic.name)}
                        disabled={processing}
                        title="Unfollow topic"
                      >
                        <FiTrash2 /> {processing ? "…" : "Unfollow"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="following-empty-state">
              <FiTag className="empty-icon" />
              <h3>No Followed Topics</h3>
              <p>
                {searchVal
                  ? `No followed topics match your filter "${searchVal}".`
                  : "You are not following any research topics yet. Start exploring active scientific domains!"}
              </p>
              {!searchVal && (
                <Link to={ROUTE_PATHS.TOPICS} className="explore-cta-btn">
                  Explore Topics
                </Link>
              )}
            </div>
          )
        ) : (
          /* JOURNALS TAB */
          filteredJournals.length > 0 ? (
            <div className="following-grid">
              {filteredJournals.map((journal) => {
                const processing = unfollowProcessing.has(`journal-${journal.id}`);

                return (
                  <article key={`journal-${journal.id}`} className="followed-item-card journal-card">
                    <Link className="card-left followed-item-shortcut" to={getJournalShortcut(journal)} title={`Open ${journal.name}`}>
                      <div className="card-icon journal-icon">
                        <FiBookOpen />
                      </div>
                      <div className="card-info">
                        <h3>{journal.name}</h3>
                        <div className="journal-tags">
                          {journal.publisher && <span className="publisher-tag">{journal.publisher}</span>}
                          {journal.impactFactor && <span className="if-tag">IF: {journal.impactFactor}</span>}
                          {journal.quartile && <span className="q-tag">{journal.quartile}</span>}
                        </div>
                      </div>
                      <FiExternalLink className="followed-shortcut-icon" />
                    </Link>

                    <div className="card-right">
                      <Link to={getJournalShortcut(journal)} className="action-link-btn" title="View details">
                        View <FiExternalLink />
                      </Link>
                      <button
                        type="button"
                        className="unfollow-action-btn"
                        onClick={() => handleUnfollowJournal(journal.id, journal.name)}
                        disabled={processing}
                        title="Untrack journal"
                      >
                        <FiTrash2 /> {processing ? "…" : "Untrack"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="following-empty-state">
              <FiBookOpen className="empty-icon" />
              <h3>No Tracked Journals</h3>
              <p>
                {searchVal
                  ? `No followed journals match your filter "${searchVal}".`
                  : "You are not tracking any academic journals yet. Track journals to follow new publications!"}
              </p>
              {!searchVal && (
                <Link to={ROUTE_PATHS.PAPERS} className="explore-cta-btn">
                  Search Journals & Papers
                </Link>
              )}
            </div>
          )
        )}
      </div>
    </MainLayout>
  );
}

export default FollowingPage;
