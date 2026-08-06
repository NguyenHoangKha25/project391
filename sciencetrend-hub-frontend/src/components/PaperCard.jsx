import { useState } from "react";
import { Link } from "react-router-dom";
import { FiBookmark, FiExternalLink, FiLoader, FiFileText } from "react-icons/fi";
import { formatNumber } from "../utils/apiData";
import "../styles/DashboardPage.css";

function PaperCard({
  title,
  source,
  authors,
  year,
  tag,
  href,
  detailPath,
  saved = false,
  onBookmark,
  variant = "compact", // default is compact
  rank,
  abstract,
  keywords = [],
  citationCount = 0,
  doi,
}) {
  const [bookmarking, setBookmarking] = useState(false);
  
  const displayAuthors = Array.isArray(authors)
    ? authors.map(a => (a && typeof a === "object" ? a.name || a.authorName : a)).filter(Boolean).join(", ")
    : (typeof authors === "string" ? authors : "");

  const metadata = [displayAuthors, year].filter(Boolean).join(" · ");

  async function handleBookmark() {
    if (bookmarking || !onBookmark) return;
    setBookmarking(true);
    try {
      await onBookmark();
    } finally {
      setBookmarking(false);
    }
  }

  const cleanAbstract = typeof abstract === "string"
    ? (abstract.length > 200 ? abstract.substring(0, 190) + "..." : abstract)
    : "";

  // Render rich card layout
  if (variant === "rich") {
    const safeKeywords = Array.isArray(keywords) ? keywords : [];
    const displayKeywords = safeKeywords.slice(0, 4);
    const extraKeywordsCount = safeKeywords.length - displayKeywords.length;

    return (
      <article className="rich-paper-card">
        {/* Left Side: Rank and File Icon */}
        <div className="rich-paper-rank-section">
          {rank && <span className="rich-paper-rank-badge">{rank}</span>}
          <div className="rich-paper-icon-box">
            <FiFileText />
          </div>
        </div>

        {/* Center: Details */}
        <div className="rich-paper-details">
          <h3 className="rich-paper-title">{title}</h3>
          
          <div className="rich-paper-meta-row">
            <span className="rich-paper-authors">{displayAuthors || "Unknown Authors"}</span>
            {year && <span className="rich-paper-meta-dot" />}
            {year && <span className="rich-paper-year">{year}</span>}
            {source && <span className="rich-paper-meta-dot" />}
            {source && <span className="rich-paper-source">{source}</span>}
          </div>

          {cleanAbstract && <p className="rich-paper-abstract">{cleanAbstract}</p>}

          {/* Keywords row */}
          {keywords.length > 0 && (
            <div className="rich-paper-keywords-row">
              {displayKeywords.map((kw, i) => (
                <span key={i} className={`rich-paper-kw-tag tag-color-${i % 5}`}>
                  {kw}
                </span>
              ))}
              {extraKeywordsCount > 0 && (
                <span className="rich-paper-kw-tag tag-more">
                  +{extraKeywordsCount}
                </span>
              )}
            </div>
          )}

          {/* DOI / Source Info */}
          <div className="rich-paper-footer-meta">
            {doi && <span className="rich-paper-doi">DOI: {doi}</span>}
            {doi && source && <span className="rich-paper-meta-divider" />}
            <span className="rich-paper-api-source">Source: {source || "OpenAlex"}</span>
          </div>
        </div>

        {/* Right Side: Citations & Actions */}
        <div className="rich-paper-stats-section">
          <div className="rich-paper-citations-box">
            <span className="citations-label">Citations</span>
            <span className="citations-val">{formatNumber(citationCount)}</span>
          </div>

          <div className="rich-paper-actions-stack">
            {detailPath && (
              <Link className="rich-paper-action-btn view-details" to={detailPath}>
                <span>View Details</span>
                <FiExternalLink />
              </Link>
            )}
            
            <button
              type="button"
              className={`rich-paper-action-btn bookmark-btn ${saved ? "is-saved" : ""}`}
              onClick={handleBookmark}
              disabled={bookmarking}
            >
              {bookmarking ? (
                <FiLoader className="is-spinning" />
              ) : (
                <>
                  <FiBookmark />
                  <span>{saved ? "Saved" : "Bookmark"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </article>
    );
  }

  // Fallback to normal/compact layout for Dashboard/Bookmarks
  return (
    <article className="db-paper-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", gap: "16px" }}>
      <div className="db-paper-main" style={{ flex: 1, minWidth: 0 }}>
        {(tag || source) && (
          <div className="db-paper-heading" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            {tag && <span className="db-paper-tag" style={{ display: "inline-block", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", backgroundColor: "#eff6ff", color: "#2563eb" }}>{tag}</span>}
            {source && <span className="db-paper-source" style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>{source}</span>}
          </div>
        )}
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0", lineHeight: "1.35" }}>{title}</h3>
        {metadata && <p style={{ fontSize: "13px", color: "#64748b", margin: 0, fontWeight: "500" }}>{metadata}</p>}
      </div>

      <div className="db-paper-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          className={`action-btn ${saved ? "is-saved" : ""}`}
          aria-label={saved ? "Remove from bookmarks" : "Save to bookmarks"}
          onClick={handleBookmark}
          disabled={bookmarking}
          title={saved ? "Saved to bookmarks" : "Save to bookmarks"}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: saved ? "#eff6ff" : "#ffffff", color: saved ? "#2563eb" : "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}
        >
          {bookmarking ? (
            <FiLoader className="is-spinning" />
          ) : (
            <>
              <FiBookmark />
              <span>{saved ? "Saved" : "Save"}</span>
            </>
          )}
        </button>

        {(detailPath || href) && (
          detailPath ? (
            <Link
              to={detailPath}
              aria-label="View paper details"
              title="View paper details"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", color: "#4f46e5", textDecoration: "none", fontSize: "13px", fontWeight: "700" }}
            >
              <span>View</span>
              <FiExternalLink />
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label="Open paper in new tab"
              title="Open paper"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", color: "#4f46e5", textDecoration: "none", fontSize: "13px", fontWeight: "700" }}
            >
              <span>Open</span>
              <FiExternalLink />
            </a>
          )
        )}
      </div>
    </article>
  );
}

export default PaperCard;
