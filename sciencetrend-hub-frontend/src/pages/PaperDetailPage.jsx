import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiBookmark, FiCheck, FiExternalLink, FiFileText } from "react-icons/fi";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/useAuth";
import { addBookmark, checkBookmarked, removeBookmark } from "../services/bookmarkService";
import { getPaperById } from "../services/paperService";
import { normalizePaper } from "../utils/apiData";
import { getPersistentCachedData, setPersistentCachedData } from "../utils/apiCache";
import { ROUTE_PATHS } from "../routes/routePaths";
import "../styles/WorkspacePages.css";
import "../styles/CatalogPages.css";

function getCachedPaper(paperId) {
  const cached = getPersistentCachedData(`paper_detail_${paperId}`);
  return cached && typeof cached === "object" && cached.title ? cached : null;
}

function PaperDetailPage() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [initialPaper] = useState(() => getCachedPaper(paperId));
  const [paper, setPaper] = useState(initialPaper);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(!initialPaper);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cachedPaper = getCachedPaper(paperId);
      setError("");
      if (cachedPaper) {
        setPaper(cachedPaper);
        setLoading(false);
      } else {
        setPaper(null);
        setLoading(true);
      }

      try {
        const [paperResult, bookmarkResult] = await Promise.allSettled([
          getPaperById(paperId),
          isLoggedIn ? checkBookmarked(paperId) : Promise.resolve(false),
        ]);

        if (!cancelled) {
          if (paperResult.status === "fulfilled") {
            const normalized = normalizePaper(paperResult.value);
            if (normalized.title !== "Untitled paper") {
              const freshPaper = { ...paperResult.value, ...normalized };
              setPaper(freshPaper);
              setPersistentCachedData(`paper_detail_${paperId}`, freshPaper);
              setError("");
            }
          } else if (!cachedPaper) {
            setError(paperResult.reason?.message || "Could not load this paper.");
          }

          if (bookmarkResult.status === "fulfilled") {
            const value = bookmarkResult.value;
            setSaved(Boolean(value?.bookmarked ?? value?.saved ?? value));
          }
        }
      } catch (loadError) {
        if (!cancelled && !cachedPaper) {
          setError(loadError.message || "Could not load this paper.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, paperId]);

  async function toggleSaved() {
    if (!isLoggedIn) {
      navigate(ROUTE_PATHS.LOGIN, { state: { from: ROUTE_PATHS.paperDetail(paperId) } });
      return;
    }
    const previous = saved;
    setSaved(!previous);
    try {
      if (previous) await removeBookmark(paperId); else await addBookmark(paperId);
    } catch {
      setSaved(previous);
    }
  }

  return (
    <MainLayout title="Paper details" subtitle="Publication metadata, abstract and citation information">
      <section className="workspace-page paper-detail-page">
        <Link className="paper-back-link" to={ROUTE_PATHS.PAPERS}><FiArrowLeft /> Back to search</Link>
        {loading ? (
          <div className="workspace-empty"><span className="workspace-loading-spinner" />Loading paper…</div>
        ) : error || !paper ? (
          <div className="workspace-empty">{error || "Paper not found."}</div>
        ) : (
          <article className="paper-detail-card">
            <div className="paper-detail-heading">
              <span className="paper-detail-icon"><FiFileText /></span>
              <div>
                <span className="catalog-kicker">Research paper</span>
                <h2>{paper.title}</h2>
                <p>{paper.authors}</p>
              </div>
            </div>
            <div className="paper-detail-actions">
              <button type="button" className={`workspace-button ${saved ? "is-active" : ""}`} onClick={toggleSaved}>
                {saved ? <><FiCheck /> Saved</> : <><FiBookmark /> Save paper</>}
              </button>
              {paper.href && <a className="workspace-button" href={paper.href} target="_blank" rel="noreferrer">Open source <FiExternalLink /></a>}
            </div>
            <dl className="paper-detail-meta">
              <div><dt>Year</dt><dd>{paper.year || "Not provided"}</dd></div>
              <div><dt>Journal / source</dt><dd>{paper.journalName || paper.source}</dd></div>
              <div><dt>Citations</dt><dd>{Number(paper.citationCount || 0).toLocaleString()}</dd></div>
              <div><dt>DOI</dt><dd>{paper.doi || "Not provided"}</dd></div>
            </dl>
            <section className="paper-detail-section">
              <h3>Abstract</h3>
              <p>{paper.abstract || "No abstract is available for this paper."}</p>
            </section>
            {paper.keywords?.length > 0 && (
              <section className="paper-detail-section">
                <h3>Keywords</h3>
                <div className="paper-keywords">
                  {paper.keywords.map((keyword) => {
                    const value = typeof keyword === "string" ? keyword : keyword.name || keyword.keyword;
                    return <Link key={value} to={`${ROUTE_PATHS.PAPERS}?keyword=${encodeURIComponent(value)}`}>{value}</Link>;
                  })}
                </div>
              </section>
            )}
          </article>
        )}
      </section>
    </MainLayout>
  );
}

export default PaperDetailPage;
