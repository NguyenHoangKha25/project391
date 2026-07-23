import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiBookOpen, FiCheck, FiExternalLink, FiSearch, FiX } from "react-icons/fi";
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
import { normalizeJournal, normalizePaper, toArray } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/CatalogPages.css";

const JOURNALS_CACHE_KEY = "journals_default_v1";

function getCachedJournalsData() {
  const cached = getPersistentCachedData(JOURNALS_CACHE_KEY);
  if (!cached || typeof cached !== "object") return null;

  const journals = Array.isArray(cached.journals) ? cached.journals : [];
  const topIds = Array.isArray(cached.topIds) ? cached.topIds : [];
  return journals.length > 0 ? { journals, topIds } : null;
}

function JournalsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [initialData] = useState(getCachedJournalsData);
  const [query, setQuery] = useState("");
  const [journals, setJournals] = useState(() => initialData?.journals ?? []);
  const [topIds, setTopIds] = useState(() => new Set(initialData?.topIds ?? []));
  const [followedIds, setFollowedIds] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const loadRequestIdRef = useRef(0);

  const loadJournals = useCallback(async (search = "") => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
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
      const requests = [
        search ? searchJournals(search, { page: 0, size: 50 }) : getJournals({ page: 0, size: 50 }),
        getTopJournals(10),
      ];
      if (isLoggedIn) requests.push(getFollowedJournals());
      const [listResult, topResult, followedResult] = await Promise.allSettled(requests);
      if (requestId !== loadRequestIdRef.current) return;

      const freshJournals = listResult.status === "fulfilled"
        ? toArray(listResult.value, ["journals"])
            .map(normalizeJournal)
            .filter((journal) => journal.name !== "Untitled journal")
        : [];
      const freshTopIds = topResult.status === "fulfilled"
        ? toArray(topResult.value, ["journals"])
            .map(normalizeJournal)
            .filter((journal) => journal.name !== "Untitled journal")
            .map((journal) => String(journal.id))
        : [];

      if (isDefaultLoad) {
        const nextData = {
          journals: freshJournals.length > 0 ? freshJournals : (cachedData?.journals ?? []),
          topIds: freshTopIds.length > 0 ? freshTopIds : (cachedData?.topIds ?? []),
        };
        setJournals(nextData.journals);
        setTopIds(new Set(nextData.topIds));

        if (freshJournals.length > 0 || freshTopIds.length > 0) {
          setPersistentCachedData(JOURNALS_CACHE_KEY, nextData);
        }
      } else {
        setJournals(freshJournals);
        setTopIds(new Set(freshTopIds));
      }

      if (followedResult?.status === "fulfilled") {
        setFollowedIds(new Set(
          toArray(followedResult.value, ["journals"])
            .map((item, index) => String(normalizeJournal(item, index).id)),
        ));
      }

      if (listResult.status === "rejected" && !cachedData) {
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

  async function openJournal(journal) {
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
      setDetailLoading(false);
    }
  }

  async function toggleFollow(journalId) {
    if (!isLoggedIn) {
      navigate(ROUTE_PATHS.LOGIN, { state: { from: ROUTE_PATHS.JOURNALS } });
      return;
    }
    const key = String(journalId);
    const following = followedIds.has(key);
    setFollowedIds((current) => {
      const next = new Set(current);
      if (following) next.delete(key); else next.add(key);
      return next;
    });
    try {
      if (following) await unfollowJournal(journalId); else await followJournal(journalId);
    } catch {
      setFollowedIds((current) => {
        const next = new Set(current);
        if (following) next.add(key); else next.delete(key);
        return next;
      });
    }
  }

  const resultLabel = useMemo(() => `${journals.length} journal${journals.length === 1 ? "" : "s"}`, [journals.length]);

  return (
    <MainLayout title="Journals" subtitle="Browse publication venues and the papers they publish">
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
          <div className="workspace-empty"><span className="workspace-loading-spinner" />Loading journals…</div>
        ) : journals.length === 0 ? (
          <div className="workspace-empty">No journals match this search.</div>
        ) : (
          <div className="catalog-grid">
            {journals.map((journal) => {
              const followed = followedIds.has(String(journal.id));
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
                      <button type="button" className="workspace-button" onClick={() => openJournal(journal)}>View journal</button>
                      <button type="button" className={`workspace-button ${followed ? "is-active" : ""}`} onClick={() => toggleFollow(journal.id)}>
                        {followed ? <><FiCheck /> Following</> : "Follow"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="catalog-drawer-backdrop" onClick={() => setSelected(null)}>
            <aside className="catalog-drawer" onClick={(event) => event.stopPropagation()}>
              <button className="catalog-drawer-close" type="button" aria-label="Close journal details" onClick={() => setSelected(null)}><FiX /></button>
              <span className="catalog-kicker">Journal profile</span>
              <h2>{selected.name}</h2>
              <p>{selected.description || `${selected.publisher} · ${selected.subject}`}</p>
              <div className="catalog-detail-facts">
                {selected.issn && <span><strong>ISSN</strong>{selected.issn}</span>}
                {selected.impactFactor && <span><strong>Impact factor</strong>{selected.impactFactor}</span>}
                {selected.quartile && <span><strong>Quartile</strong>{selected.quartile}</span>}
              </div>
              {selected.homepage && <a className="catalog-external" href={selected.homepage} target="_blank" rel="noreferrer">Journal website <FiExternalLink /></a>}
              <h3 className="catalog-section-title">Recent papers</h3>
              {detailLoading ? <div className="catalog-inline-empty">Loading journal papers…</div> : papers.length > 0 ? (
                <div className="catalog-paper-list">
                  {papers.map((paper) => (
                    <Link key={paper.id} to={ROUTE_PATHS.paperDetail(paper.id)}>
                      <strong>{paper.title}</strong><span>{paper.authors} · {paper.year || "Year unavailable"}</span>
                    </Link>
                  ))}
                </div>
              ) : <div className="catalog-inline-empty">No papers are available for this journal.</div>}
            </aside>
          </div>
        )}
      </section>
    </MainLayout>
  );
}

export default JournalsPage;
