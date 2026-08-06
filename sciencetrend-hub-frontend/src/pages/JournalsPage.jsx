import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiExternalLink,
  FiFileText,
  FiGlobe,
  FiHash,
  FiLoader,
  FiSearch,
  FiX,
} from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import {
  followJournal,
  getFollowedJournals,
  getJournalById,
  getJournals,
  getPapersByJournal,
  getTopJournals,
  searchJournals,
  unfollowJournal,
} from "../services/journalService";
import { getDashboardOverview } from "../services/dashboardService";
import { formatNumber, normalizeJournal, normalizePaper, toArray } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/CatalogPages.css";

const JOURNALS_CACHE_KEY = "journals_default_v1";

function getDashboardJournalSummaries(dashboard) {
  return Array.isArray(dashboard?.topJournals)
    ? dashboard.topJournals
        .filter((journal) => journal?.label)
        .map((journal) => ({
          id: `summary-${journal.label}`,
          name: journal.label,
          publisher: "Publication catalog",
          subject: "Research journal",
          paperCount: Number(journal.value) || 0,
          summaryOnly: true,
        }))
    : [];
}

function getCachedJournalsData() {
  const cached = getPersistentCachedData(JOURNALS_CACHE_KEY);
  if (cached && typeof cached === "object") {
    const journals = Array.isArray(cached.journals) ? cached.journals : [];
    const topIds = Array.isArray(cached.topIds) ? cached.topIds : [];
    if (journals.length > 0) return { journals, topIds };
  }

  const dashboard = getPersistentCachedData("dashboard_overview_v3");
  const dashboardJournals = getDashboardJournalSummaries(dashboard);

  return dashboardJournals.length > 0
    ? { journals: dashboardJournals, topIds: [] }
    : null;
}

function normalizeJournalList(response) {
  return toArray(response, ["journals"])
    .map(normalizeJournal)
    .filter((journal) => journal.name !== "Untitled journal");
}

function JournalsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [initialData] = useState(getCachedJournalsData);
  const [query, setQuery] = useState("");
  const [journals, setJournals] = useState(() => initialData?.journals ?? []);
  const [topIds, setTopIds] = useState(() => new Set(initialData?.topIds ?? []));
  const [followedIds, setFollowedIds] = useState(new Set());
  const [followProcessing, setFollowProcessing] = useState(new Set());
  const [followNotice, setFollowNotice] = useState(null);
  const [selected, setSelected] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const loadRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const followActionVersionRef = useRef(0);

  const loadJournals = useCallback(async (search = "") => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const followActionVersion = followActionVersionRef.current;
    const isDefaultLoad = !search;
    const cachedData = isDefaultLoad ? getCachedJournalsData() : null;

    if (cachedData) {
      setJournals(cachedData.journals);
      setTopIds(new Set(cachedData.topIds));
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      let quickFallbackJournals = cachedData?.journals ?? [];
      const listRequest = search
        ? searchJournals(search, { page: 0, size: 20 })
        : getJournals({ page: 0, size: 20 });
      const topRequest = getTopJournals(20);

      if (isDefaultLoad && !cachedData) {
        getDashboardOverview().then((response) => {
          if (requestId !== loadRequestIdRef.current) return;
          const summaryJournals = getDashboardJournalSummaries(response);
          if (summaryJournals.length === 0) return;

          quickFallbackJournals = summaryJournals;
          const summaryData = { journals: summaryJournals, topIds: [] };
          setJournals(summaryJournals);
          setLoading(false);
          setPersistentCachedData(JOURNALS_CACHE_KEY, summaryData);
        }).catch(() => {});

        topRequest.then((response) => {
          if (requestId !== loadRequestIdRef.current) return;
          const quickJournals = normalizeJournalList(response);
          if (quickJournals.length === 0) return;

          quickFallbackJournals = quickJournals;
          const quickData = {
            journals: quickJournals,
            topIds: quickJournals.map((journal) => String(journal.id)),
          };
          setJournals(quickData.journals);
          setTopIds(new Set(quickData.topIds));
          setLoading(false);
          setPersistentCachedData(JOURNALS_CACHE_KEY, quickData);
        }).catch(() => {});
      }

      const requests = [
        listRequest,
        topRequest,
      ];
      if (isLoggedIn) requests.push(getFollowedJournals());
      const [listResult, topResult, followedResult] = await Promise.allSettled(requests);
      if (requestId !== loadRequestIdRef.current) return;

      const freshJournals = listResult.status === "fulfilled"
        ? normalizeJournalList(listResult.value)
        : [];
      const freshTopJournals = topResult.status === "fulfilled"
        ? normalizeJournalList(topResult.value)
        : [];
      const matchingTopJournals = search
        ? freshTopJournals.filter((journal) => (
            `${journal.name} ${journal.publisher} ${journal.subject}`
              .toLowerCase()
              .includes(search.toLowerCase())
          ))
        : freshTopJournals;
      const freshTopIds = freshTopJournals.map((journal) => String(journal.id));

      if (isDefaultLoad) {
        const nextData = {
          journals: freshJournals.length > 0
              ? freshJournals
              : matchingTopJournals.length > 0
                ? matchingTopJournals
                : quickFallbackJournals,
          topIds: freshTopIds.length > 0 ? freshTopIds : (cachedData?.topIds ?? []),
        };
        setJournals(nextData.journals);
        setTopIds(new Set(nextData.topIds));

        if (freshJournals.length > 0 || freshTopIds.length > 0) {
          setPersistentCachedData(JOURNALS_CACHE_KEY, nextData);
        }
      } else {
        setJournals(freshJournals.length > 0 ? freshJournals : matchingTopJournals);
        setTopIds(new Set(freshTopIds));
      }

      if (
        followedResult?.status === "fulfilled"
        && followActionVersion === followActionVersionRef.current
      ) {
        setFollowedIds(new Set(
          toArray(followedResult.value, ["journals"])
            .map((item, index) => String(normalizeJournal(item, index).id)),
        ));
      }

      if (
        listResult.status === "rejected"
        && matchingTopJournals.length === 0
        && !cachedData
        && quickFallbackJournals.length === 0
      ) {
        setError(listResult.reason?.message || "Could not load journals.");
      }
    } catch (loadError) {
      if (!cachedData) {
        setJournals([]);
        setError(loadError.message || "Could not load journals.");
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  useEffect(() => {
    if (!followNotice) return undefined;
    const timer = setTimeout(() => setFollowNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [followNotice]);

  async function openJournal(journal) {
    const detailRequestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = detailRequestId;
    const cacheKey = `journal_detail_${journal.id}`;
    const cachedDetail = getPersistentCachedData(cacheKey);
    const hasCachedDetail = cachedDetail
      && typeof cachedDetail === "object"
      && cachedDetail.journal;

    setSelected(hasCachedDetail ? cachedDetail.journal : journal);
    setPapers(hasCachedDetail && Array.isArray(cachedDetail.papers) ? cachedDetail.papers : []);
    setDetailLoading(!hasCachedDetail);

    try {
      const [detailResult, papersResult] = await Promise.allSettled([
        getJournalById(journal.id),
        getPapersByJournal(journal.id, 0, 8),
      ]);
      if (detailRequestId !== detailRequestIdRef.current) return;

      const normalizedJournal = detailResult.status === "fulfilled"
        ? normalizeJournal(detailResult.value)
        : null;
      const freshJournal = normalizedJournal?.name !== "Untitled journal"
        ? normalizedJournal
        : null;
      const freshPapers = papersResult.status === "fulfilled"
        ? toArray(papersResult.value).map(normalizePaper)
        : [];
      const nextDetail = {
        journal: freshJournal ?? cachedDetail?.journal ?? journal,
        papers: freshPapers.length > 0 ? freshPapers : (cachedDetail?.papers ?? []),
      };

      setSelected(nextDetail.journal);
      setPapers(nextDetail.papers);

      if (freshJournal || freshPapers.length > 0) {
        setPersistentCachedData(cacheKey, nextDetail);
      }
    } finally {
      if (detailRequestId === detailRequestIdRef.current) setDetailLoading(false);
    }
  }

  function closeJournal() {
    detailRequestIdRef.current += 1;
    setSelected(null);
    setPapers([]);
    setDetailLoading(false);
  }

  async function toggleFollow(journalId) {
    if (!isLoggedIn) {
      navigate(ROUTE_PATHS.LOGIN, { state: { from: ROUTE_PATHS.JOURNALS } });
      return;
    }

    const numericId = Number(journalId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setFollowNotice({ type: "warning", message: "Cannot follow this journal because its ID is invalid." });
      return;
    }

    const key = String(numericId);
    if (followProcessing.has(key)) return;

    const following = followedIds.has(key);
    followActionVersionRef.current += 1;
    setFollowProcessing((current) => new Set(current).add(key));
    setFollowedIds((current) => {
      const next = new Set(current);
      if (following) next.delete(key); else next.add(key);
      return next;
    });

    try {
      if (following) await unfollowJournal(numericId); else await followJournal(numericId);
      setFollowNotice({
        type: "success",
        message: following ? "Journal unfollowed." : "Journal followed successfully.",
      });
    } catch (followError) {
      const message = String(followError?.message || "").toLowerCase();

      if (!following && message.includes("already followed")) {
        setFollowedIds((current) => new Set(current).add(key));
        setFollowNotice({ type: "info", message: "You are already following this journal." });
        return;
      }

      if (following && message.includes("follow not found")) {
        setFollowedIds((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
        setFollowNotice({ type: "info", message: "This journal was already unfollowed." });
        return;
      }

      setFollowedIds((current) => {
        const next = new Set(current);
        if (following) next.add(key); else next.delete(key);
        return next;
      });
      setFollowNotice({
        type: "warning",
        message: followError?.message || "Could not update this journal. Please try again.",
      });
    } finally {
      setFollowProcessing((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  const resultLabel = useMemo(() => `${journals.length} journal${journals.length === 1 ? "" : "s"}`, [journals.length]);
  const journalInsights = useMemo(() => {
    const keywordCounts = new Map();
    let totalCitations = 0;
    let latestYear = 0;

    papers.forEach((paper) => {
      totalCitations += Number(paper.citationCount) || 0;
      const year = Number(paper.year);
      if (Number.isInteger(year) && year > latestYear) latestYear = year;
      (Array.isArray(paper.keywords) ? paper.keywords : []).forEach((keyword) => {
        const name = String(keyword || "").trim();
        if (name) keywordCounts.set(name, (keywordCounts.get(name) || 0) + 1);
      });
    });

    return {
      latestYear,
      totalCitations,
      keywords: [...keywordCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([name]) => name),
    };
  }, [papers]);
  const selectedJournalKey = selected ? String(selected.id) : "";
  const selectedFollowed = selectedJournalKey ? followedIds.has(selectedJournalKey) : false;
  const selectedFollowProcessing = selectedJournalKey ? followProcessing.has(selectedJournalKey) : false;
  const selectedPaperCount = selected?.paperCount > 0 ? selected.paperCount : papers.length;

  return (
    <MainLayout title="Journals" subtitle="Browse publication venues and the papers they publish">
      {followNotice && (
        <div className={`st-toast ${followNotice.type}`}>
          <span>{followNotice.message}</span>
        </div>
      )}
      <section className="workspace-page catalog-page">
        <form className="catalog-toolbar" onSubmit={(event) => { event.preventDefault(); loadJournals(query.trim()); }}>
          <div>
            <span className="catalog-kicker">Publication directory</span>
            <h2>Find the right journal</h2>
            <p>{loading ? "Loading journals…" : resultLabel}</p>
          </div>
          <label className="catalog-search">
            <FiSearch />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by journal, publisher or subject" />
            {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); loadJournals(); }}><FiX /></button>}
          </label>
        </form>

        {error && <div className="workspace-notice warning">{error}</div>}
        {loading ? (
          <div className="workspace-empty page-loading-state"><span className="workspace-loading-spinner" />Loading journals…</div>
        ) : journals.length === 0 ? (
          <div className="workspace-empty">No journals match this search.</div>
        ) : (
          <div className="catalog-grid">
            {journals.map((journal) => {
              const followed = followedIds.has(String(journal.id));
              const processing = followProcessing.has(String(journal.id));
              return (
                <article className="catalog-card" key={journal.id}>
                  <div className="catalog-card-icon"><FiBookOpen /></div>
                  <div className="catalog-card-main">
                    <div className="catalog-card-heading">
                      <div>
                        <h3>{journal.name}</h3>
                        <p>{journal.publisher}</p>
                      </div>
                      {topIds.has(String(journal.id)) && <span className="catalog-badge">Top journal</span>}
                    </div>
                    <div className="catalog-meta">
                      <span>{journal.subject}</span>
                      {journal.paperCount > 0 && <span>{journal.paperCount.toLocaleString()} papers</span>}
                      {journal.issn && <span>ISSN {journal.issn}</span>}
                    </div>
                    <div className="catalog-actions">
                      {journal.summaryOnly ? (
                        <button
                          type="button"
                          className="workspace-button"
                          onClick={() => navigate(`${ROUTE_PATHS.PAPERS}?journal=${encodeURIComponent(journal.name)}`)}
                        >
                          View papers
                        </button>
                      ) : (
                        <>
                          <button type="button" className="workspace-button" onClick={() => openJournal(journal)}>View journal</button>
                          <button
                            type="button"
                            className={`workspace-button ${followed ? "is-active" : ""}`}
                            onClick={() => toggleFollow(journal.id)}
                            disabled={processing}
                          >
                            {processing
                              ? <><FiLoader className="is-spinning" /> Updating…</>
                              : followed
                                ? <><FiCheck /> Following</>
                                : "Follow"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="catalog-drawer-backdrop" onClick={closeJournal}>
            <aside className="catalog-drawer journal-profile-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="journal-profile-topline">
                <span className="catalog-kicker">Journal profile</span>
                <button className="catalog-drawer-close" type="button" aria-label="Close journal details" onClick={closeJournal}><FiX /></button>
              </div>

              <header className="journal-profile-hero">
                <div className="journal-profile-icon"><FiBookOpen /></div>
                <div className="journal-profile-heading">
                  <div className="journal-profile-tags">
                    {selected.subject && <span>{selected.subject}</span>}
                    {topIds.has(selectedJournalKey) && <span className="is-highlighted">Top journal</span>}
                    {selected.openAccess && <span className="is-access">Open access</span>}
                  </div>
                  <h2>{selected.name}</h2>
                  <p>{selected.publisher || "Publisher unavailable"}</p>
                </div>
              </header>

              <div className="journal-profile-actions">
                <button
                  type="button"
                  className={`workspace-button journal-follow-button ${selectedFollowed ? "is-active" : ""}`}
                  onClick={() => toggleFollow(selected.id)}
                  disabled={selectedFollowProcessing}
                >
                  {selectedFollowProcessing
                    ? <><FiLoader className="is-spinning" /> Updating…</>
                    : selectedFollowed
                      ? <><FiCheck /> Following</>
                      : "Follow journal"}
                </button>
                <Link className="workspace-button primary journal-browse-button" to={`${ROUTE_PATHS.PAPERS}?journal=${encodeURIComponent(selected.name)}`}>
                  Browse papers <FiArrowRight />
                </Link>
                {selected.homepage && (
                  <a className="journal-website-button" href={selected.homepage} target="_blank" rel="noreferrer" aria-label={`Open ${selected.name} website`}>
                    <FiGlobe /> <FiExternalLink />
                  </a>
                )}
              </div>

              <section className="journal-profile-summary">
                <div>
                  <span>About this journal</span>
                  <h3>Publication overview</h3>
                </div>
                <p>
                  {selected.description || `This profile combines the catalog metadata available for ${selected.name} with its latest indexed publication records.`}
                </p>
              </section>

              <div className="journal-profile-stats" aria-label="Journal statistics">
                <article>
                  <FiFileText />
                  <span>Indexed papers</span>
                  <strong>{selectedPaperCount > 0 ? formatNumber(selectedPaperCount) : "—"}</strong>
                </article>
                <article>
                  <FiBarChart2 />
                  <span>Citations in preview</span>
                  <strong>{papers.length > 0 ? formatNumber(journalInsights.totalCitations) : "—"}</strong>
                </article>
                <article>
                  <FiCalendar />
                  <span>Latest indexed year</span>
                  <strong>{journalInsights.latestYear || "—"}</strong>
                </article>
                <article>
                  <FiHash />
                  <span>ISSN</span>
                  <strong>{selected.issn || "Not listed"}</strong>
                </article>
              </div>

              {(selected.quartile || selected.impactFactor) && (
                <div className="journal-profile-facts">
                  {selected.quartile && <span><strong>Quartile</strong>{selected.quartile}</span>}
                  {selected.impactFactor && <span><strong>Impact factor</strong>{selected.impactFactor}</span>}
                </div>
              )}

              {journalInsights.keywords.length > 0 && (
                <section className="journal-profile-section journal-theme-section">
                  <div className="journal-section-heading">
                    <div><span>Research coverage</span><h3>Themes in recent papers</h3></div>
                    <small>{journalInsights.keywords.length} themes</small>
                  </div>
                  <div className="journal-theme-list">
                    {journalInsights.keywords.map((keyword) => (
                      <Link key={keyword} to={`${ROUTE_PATHS.PAPERS}?keyword=${encodeURIComponent(keyword)}`}>{keyword}</Link>
                    ))}
                  </div>
                </section>
              )}

              <section className="journal-profile-section">
                <div className="journal-section-heading">
                  <div><span>Latest from the index</span><h3>Recent papers</h3></div>
                  {!detailLoading && <small>{papers.length} loaded</small>}
                </div>
                {detailLoading ? (
                  <div className="journal-detail-loading"><span className="workspace-loading-spinner" />Loading journal papers…</div>
                ) : papers.length > 0 ? (
                  <div className="catalog-paper-list journal-paper-list">
                    {papers.map((paper, index) => (
                      <Link key={paper.id} to={ROUTE_PATHS.paperDetail(paper.id)}>
                        <span className="journal-paper-rank">{String(index + 1).padStart(2, "0")}</span>
                        <div className="journal-paper-copy">
                          <strong>{paper.title}</strong>
                          <p>{paper.authors}</p>
                          <div className="journal-paper-meta">
                            <span><FiCalendar />{paper.year || "Year unavailable"}</span>
                            <span><FiBarChart2 />{formatNumber(paper.citationCount)} citations</span>
                            {paper.keywords?.[0] && <span>{paper.keywords[0]}</span>}
                          </div>
                        </div>
                        <FiArrowRight className="journal-paper-arrow" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="journal-empty-state">
                    <FiFileText />
                    <h4>No recent papers indexed yet</h4>
                    <p>Search the publication catalog to discover papers associated with this journal.</p>
                    <Link to={`${ROUTE_PATHS.PAPERS}?journal=${encodeURIComponent(selected.name)}`}>Search this journal <FiArrowRight /></Link>
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default JournalsPage;
