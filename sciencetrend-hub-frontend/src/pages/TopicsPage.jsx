import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiCheck,
  FiX,
  FiTrendingUp,
  FiLayers,
  FiBookOpen,
  FiExternalLink,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import {
  getAllTopics,
  searchTopics,
  getTrendingTopics,
  followTopic,
  unfollowTopic,
  getFollowedTopics,
  getPapersByTopic,
} from "../services/topicService";
import { normalizeTopic, toArray } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import { useAuth } from "../context/useAuth";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/TopicsPage.css";

/* ── Toast Notifications Hook ── */
const TOPICS_CACHE_KEY = "topics_default_v2";

function getCachedTopicsData() {
  const cached = getPersistentCachedData(TOPICS_CACHE_KEY);
  if (!cached || typeof cached !== "object") return null;

  const topics = Array.isArray(cached.topics)
    ? cached.topics.filter((topic) => topic?.name && topic.name !== "Untitled topic")
    : [];
  const trending = Array.isArray(cached.trending)
    ? cached.trending.filter((topic) => topic?.name && topic.name !== "Untitled topic")
    : [];
  return topics.length > 0 || trending.length > 0 ? { topics, trending } : null;
}

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

function TopicsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [initialData] = useState(getCachedTopicsData);
  const [topics, setTopics] = useState(() => initialData?.topics ?? []);
  const [trending, setTrending] = useState(() => initialData?.trending ?? []);
  const [followedIds, setFollowedIds] = useState(new Set());
  const [loading, setLoading] = useState(!initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [followProcessing, setFollowProcessing] = useState(new Set());
  const loadRequestIdRef = useRef(0);

  // Drawer/Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const [topicPapers, setTopicPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const { toast, showToast } = useToast();

  // Load topics & follow status
  const loadData = useCallback(async (search = "") => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const isDefaultLoad = !search;
    const cachedData = isDefaultLoad ? getCachedTopicsData() : null;

    if (cachedData) {
      setTrending(cachedData.trending);
      setTopics(cachedData.topics);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const [followedResult, trendingResult, listResult] = await Promise.allSettled([
        isLoggedIn ? getFollowedTopics() : Promise.resolve([]),
        getTrendingTopics(5),
        search ? searchTopics(search) : getAllTopics(),
      ]);

      if (requestId !== loadRequestIdRef.current) return;

      if (followedResult.status === "fulfilled") {
        const nextFollowedIds = new Set(
          toArray(followedResult.value)
            .map((topic) => normalizeTopic(topic))
            .map((topic) => String(topic.id)),
        );
        setFollowedIds(nextFollowedIds);
      }

      const freshTrending = trendingResult.status === "fulfilled"
        ? toArray(trendingResult.value)
            .map((topic) => normalizeTopic(topic))
            .filter((topic) => topic.name !== "Untitled topic")
        : [];
      const freshTopics = listResult.status === "fulfilled"
        ? toArray(listResult.value)
            .map((topic) => normalizeTopic(topic))
            .filter((topic) => topic.name !== "Untitled topic")
        : [];

      if (isDefaultLoad) {
        const nextData = {
          trending: freshTrending.length > 0 ? freshTrending : (cachedData?.trending ?? []),
          topics: freshTopics.length > 0 ? freshTopics : (cachedData?.topics ?? []),
        };

        setTrending(nextData.trending);
        setTopics(nextData.topics);

        if (freshTrending.length > 0 || freshTopics.length > 0) {
          setPersistentCachedData(TOPICS_CACHE_KEY, nextData);
        }
      } else {
        setTopics(freshTopics);
      }

      if (listResult.status === "rejected" && !cachedData) {
        showToast("Failed to retrieve topics registry.", "warning");
      }
    } catch (err) {
      console.error("Cannot load topics data", err);
      if (!cachedData) {
        showToast("Failed to retrieve topics registry.", "warning");
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [isLoggedIn, showToast]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadData(searchQuery);
    }, searchQuery ? 400 : 0);

    return () => clearTimeout(handler);
  }, [searchQuery, loadData]);

  // Toggle follow status
  async function handleToggleFollow(topicId, topicName) {
    if (!isLoggedIn) {
      navigate(ROUTE_PATHS.LOGIN, { state: { from: ROUTE_PATHS.TOPICS } });
      return;
    }
    if (!topicId || topicId === 0 || topicId === "0") {
      showToast("Cannot follow: topic does not have a valid ID", "warning");
      return;
    }
    if (followProcessing.has(topicId)) return;

    // Set processing state
    setFollowProcessing((prev) => {
      const next = new Set(prev);
      next.add(topicId);
      return next;
    });

    const isFollowing = followedIds.has(String(topicId));

    try {
      if (isFollowing) {
        await unfollowTopic(topicId);
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(topicId));
          return next;
        });
        showToast(`Unfollowed topic: ${topicName}`, "success");
      } else {
        await followTopic(topicId);
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.add(String(topicId));
          return next;
        });
        showToast(`Following topic: ${topicName}`, "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to update follow status", "warning");
    } finally {
      setFollowProcessing((prev) => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }

  // Open Recent Papers Drawer
  async function handleOpenTopicDetails(topic) {
    const targetTopicId = topic.researchTopicId || topic.id;
    const cacheKey = `topic_papers_${targetTopicId}`;
    const storedPapers = getPersistentCachedData(cacheKey);
    const cachedPapers = Array.isArray(storedPapers) && storedPapers.length > 0
      ? storedPapers
      : null;

    setActiveTopic(topic);
    setDrawerOpen(true);
    setLoadingPapers(!cachedPapers);
    setTopicPapers(cachedPapers ?? []);

    try {
      const response = await getPapersByTopic(targetTopicId, 0, 10);
      const papersList = toArray(response, ["content", "papers"]);
      if (papersList.length > 0) {
        setTopicPapers(papersList);
        setPersistentCachedData(cacheKey, papersList);
      } else if (!cachedPapers) {
        setTopicPapers([]);
      }
    } catch {
      if (!cachedPapers) {
        showToast("Could not retrieve papers for this topic.", "warning");
      }
    } finally {
      setLoadingPapers(false);
    }
  }

  return (
    <MainLayout
      title="Topics & Keywords"
      subtitle="Explore emerging scientific domains and follow active research terms"
    >
      {toast && (
        <div className={`st-toast ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="workspace-page topics-page-container">
        
        {/* Search Bar */}
        <div className="topics-search-toolbar">
          <div className="topics-search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search research topics or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="topics-search-input"
            />
          </div>
        </div>

        {/* 1. Trending Section (only when not searching) */}
        {!searchQuery && trending.length > 0 && (
          <section className="topics-section trending-topics-section">
            <h2 className="section-title">
              <FiTrendingUp className="icon-trending" /> Top Trending Topics
            </h2>
            <div className="topics-grid trending-grid">
              {trending.map((topic, index) => {
                const isFollowing = followedIds.has(String(topic.id));
                const processing = followProcessing.has(topic.id);

                return (
                  <article key={`trending-${topic.id}`} className="topic-card trending-card">
                    <div className="trending-badge">#{index + 1} Trending</div>
                    <div className="topic-card-body" onClick={() => handleOpenTopicDetails(topic)}>
                      <h3>{topic.name}</h3>
                      <div className="topic-meta">
                        <span className="meta-item count">{topic.paperCount}</span>
                        {topic.growth && (
                          <span className={`meta-item growth positive`}>
                            {topic.growth} growth
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="topic-card-actions">
                      <button
                        type="button"
                        className={`topic-follow-btn ${isFollowing ? "following" : ""}`}
                        disabled={processing}
                        onClick={() => handleToggleFollow(topic.id, topic.name)}
                      >
                        {processing ? (
                          "…"
                        ) : isFollowing ? (
                          <>
                            <FiCheck /> Following
                          </>
                        ) : (
                          <>
                            <FiPlus /> Follow
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 2. All Topics Section */}
        <section className="topics-section all-topics-section">
          <h2 className="section-title">
            <FiLayers className="icon-all" /> {searchQuery ? "Search Results" : "Explore Scientific Topics"}
          </h2>

          {loading ? (
            <div className="cm-loading" style={{ minHeight: "180px", margin: "20px 0" }}>
              <div className="cm-spinner" />
              <p style={{ fontWeight: "700", color: "#666666" }}>Loading scientific topics...</p>
            </div>
          ) : topics.length > 0 ? (
            <div className="topics-grid explore-grid">
              {topics.map((topic) => {
                const isFollowing = followedIds.has(String(topic.id));
                const processing = followProcessing.has(topic.id);

                return (
                  <article key={`explore-${topic.id}`} className="topic-card explore-card">
                    <div className="topic-card-body" onClick={() => handleOpenTopicDetails(topic)}>
                      <h3>{topic.name}</h3>
                      <div className="topic-meta">
                        <span className="meta-item count">{topic.paperCount}</span>
                        {topic.score > 0 && (
                          <span className="meta-item score">
                            Score: {topic.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="topic-card-actions">
                      <button
                        type="button"
                        className={`topic-follow-btn ${isFollowing ? "following" : ""}`}
                        disabled={processing}
                        onClick={() => handleToggleFollow(topic.id, topic.name)}
                      >
                        {processing ? (
                          "…"
                        ) : isFollowing ? (
                          <>
                            <FiCheck /> Following
                          </>
                        ) : (
                          <>
                            <FiPlus /> Follow
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="workspace-empty" style={{ minHeight: 240, background: "rgba(255, 255, 255, 0.5)", border: "1px dashed rgba(230, 222, 211, 0.8)", borderRadius: "20px", display: "grid", placeItems: "center", padding: "30px", textAlign: "center", marginTop: "16px" }}>
              <div style={{ maxWidth: "340px", margin: "0 auto" }}>
                <FiLayers style={{ fontSize: "36px", color: "var(--st-primary, #157f91)", marginBottom: "12px", opacity: 0.8 }} />
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "var(--st-heading)", marginBottom: "6px" }}>No Topics Found</h3>
                <p style={{ fontSize: "13.5px", color: "var(--st-muted-strong)", lineHeight: "1.5", marginBottom: "16px" }}>
                  We couldn't find any scientific topics matching "{searchQuery}". Try using different terms or clear your search.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="cm-btn cm-btn-sm cm-btn-secondary"
                  style={{ minHeight: "32px", padding: "0 14px", borderRadius: "10px", border: "1px solid rgba(21,127,145,.18)", color: "var(--st-primary)", background: "var(--st-primary-soft)", cursor: "pointer", fontWeight: "750" }}
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Sliding Side Drawer for Topic Details & Papers ── */}
      <div className={`topics-drawer-backdrop ${drawerOpen ? "show" : ""}`} onClick={() => setDrawerOpen(false)}>
        <aside className={`topics-drawer ${drawerOpen ? "open" : ""}`} onClick={(e) => e.stopPropagation()}>
          <header className="drawer-header">
            <div>
              <span className="drawer-label">RESEARCH DOMAIN</span>
              <h2>{activeTopic?.name}</h2>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={() => setDrawerOpen(false)}
            >
              <FiX />
            </button>
          </header>

          <div className="drawer-content">
            <div className="drawer-stats">
              <div className="drawer-stat-item">
                <span className="label">Total Papers</span>
                <span className="value">{activeTopic?.paperCount.split(" ")[0]}</span>
              </div>
              <div className="drawer-stat-item">
                <span className="label">Topic Status</span>
                <span className="value success">Active</span>
              </div>
            </div>

            <div className="drawer-papers-section">
              <h3>
                <FiBookOpen /> Recent Publications
              </h3>

              {loadingPapers ? (
                <div className="papers-loading">Retrieving recent papers...</div>
              ) : topicPapers.length > 0 ? (
                <div className="drawer-papers-list">
                  {topicPapers.map((paper) => (
                    <article key={paper.id || paper.paperId} className="drawer-paper-card">
                      <h4>{paper.title || "Untitled Paper"}</h4>
                      <p className="paper-authors">
                        {paper.authors
                          ? toArray(paper.authors).map(a => a.name || a).join(", ")
                          : "Unknown Authors"}
                      </p>
                      <div className="paper-meta">
                        <span>{paper.publicationYear}</span>
                        <span>{paper.journalName || paper.source}</span>
                      </div>
                      {paper.doi && (
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="paper-link"
                        >
                          <FiExternalLink /> Read Publication
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="papers-empty">
                  No publications recorded under this topic yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}

export default TopicsPage;
