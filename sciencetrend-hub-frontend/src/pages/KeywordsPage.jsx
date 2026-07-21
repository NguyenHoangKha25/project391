import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiBookmark, FiCheck, FiHash, FiSearch } from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { getAllKeywords } from "../services/keywordService";
import { addKeywordBookmark, getBookmarkedKeywords, removeKeywordBookmark } from "../services/bookmarkService";
import { normalizeKeyword, toArray } from "../utils/apiData";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/CatalogPages.css";

function KeywordsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [keywords, setKeywords] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const requests = [getAllKeywords({ page: 0, size: 200 })];
      if (isLoggedIn) requests.push(getBookmarkedKeywords());
      const [keywordsResult, savedResult] = await Promise.allSettled(requests);
      if (cancelled) return;
      if (keywordsResult.status === "fulfilled") {
        setKeywords(toArray(keywordsResult.value, ["keywords"]).map(normalizeKeyword));
      } else {
        setError(keywordsResult.reason?.message || "Could not load keywords.");
      }
      setSavedIds(new Set(
        savedResult?.status === "fulfilled"
          ? toArray(savedResult.value, ["keywords"]).map((item, index) => String(normalizeKeyword(item, index).id))
          : [],
      ));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return keywords;
    return keywords.filter((keyword) => keyword.name.toLowerCase().includes(term));
  }, [keywords, query]);

  async function toggleSaved(keywordId) {
    if (!isLoggedIn) {
      navigate(ROUTE_PATHS.LOGIN, { state: { from: ROUTE_PATHS.KEYWORDS } });
      return;
    }
    const key = String(keywordId);
    const saved = savedIds.has(key);
    setSavedIds((current) => {
      const next = new Set(current);
      if (saved) next.delete(key); else next.add(key);
      return next;
    });
    try {
      if (saved) await removeKeywordBookmark(keywordId); else await addKeywordBookmark(keywordId);
    } catch {
      setSavedIds((current) => {
        const next = new Set(current);
        if (saved) next.add(key); else next.delete(key);
        return next;
      });
    }
  }

  return (
    <MainLayout title="Keywords" subtitle="Explore the terms used across the research catalog">
      <section className="workspace-page catalog-page">
        <div className="catalog-toolbar">
          <div>
            <span className="catalog-kicker">Research index</span>
            <h2>Browse keywords</h2>
            <p>{loading ? "Loading keywords…" : `${filtered.length} keywords available`}</p>
          </div>
          <label className="catalog-search">
            <FiSearch />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter keywords" />
          </label>
        </div>
        {error && <div className="workspace-notice warning">{error}</div>}
        {loading ? (
          <div className="workspace-empty"><span className="workspace-loading-spinner" />Loading keywords…</div>
        ) : filtered.length > 0 ? (
          <div className="keyword-grid">
            {filtered.map((keyword) => {
              const saved = savedIds.has(String(keyword.id));
              return (
                <article className="keyword-card" key={keyword.id}>
                  <span className="keyword-icon"><FiHash /></span>
                  <div>
                    <h3>{keyword.name}</h3>
                    <p>{keyword.paperCount > 0 ? `${keyword.paperCount.toLocaleString()} indexed papers` : "Explore matching papers"}</p>
                  </div>
                  <div className="keyword-actions">
                    <Link to={`${ROUTE_PATHS.PAPERS}?keyword=${encodeURIComponent(keyword.name)}`}>View papers</Link>
                    <button type="button" className={saved ? "is-saved" : ""} onClick={() => toggleSaved(keyword.id)} aria-label={`${saved ? "Remove" : "Save"} ${keyword.name}`}>
                      {saved ? <FiCheck /> : <FiBookmark />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="workspace-empty">No keywords match “{query}”.</div>}
      </section>
    </MainLayout>
  );
}

export default KeywordsPage;
