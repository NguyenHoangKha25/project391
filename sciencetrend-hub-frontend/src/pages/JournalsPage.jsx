import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/CatalogPages.css";

function JournalsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [query, setQuery] = useState("");
  const [journals, setJournals] = useState([]);
  const [topIds, setTopIds] = useState(new Set());
  const [followedIds, setFollowedIds] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadJournals = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const requests = [
        search ? searchJournals(search, { page: 0, size: 50 }) : getJournals({ page: 0, size: 50 }),
        getTopJournals(10),
      ];
      if (isLoggedIn) requests.push(getFollowedJournals());
      const [listResult, topResult, followedResult] = await Promise.allSettled(requests);
      if (listResult.status === "rejected") throw listResult.reason;
      const list = toArray(listResult.value, ["journals"]).map(normalizeJournal);
      setJournals(list);
      setTopIds(new Set(
        topResult.status === "fulfilled"
          ? toArray(topResult.value, ["journals"]).map((item, index) => String(normalizeJournal(item, index).id))
          : [],
      ));
      setFollowedIds(new Set(
        followedResult?.status === "fulfilled"
          ? toArray(followedResult.value, ["journals"]).map((item, index) => String(normalizeJournal(item, index).id))
          : [],
      ));
    } catch (loadError) {
      setJournals([]);
      setError(loadError.message || "Could not load journals.");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  async function openJournal(journal) {
    setSelected(journal);
    setPapers([]);
    setDetailLoading(true);
    try {
      const [detailResult, papersResult] = await Promise.allSettled([
        getJournalById(journal.id),
        getPapersByJournal(journal.id, 0, 8),
      ]);
      if (detailResult.status === "fulfilled") {
        setSelected(normalizeJournal(detailResult.value));
      }
      if (papersResult.status === "fulfilled") {
        setPapers(toArray(papersResult.value).map(normalizePaper));
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
