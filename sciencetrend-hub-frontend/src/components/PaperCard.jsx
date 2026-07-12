import { useState } from "react";
import { FiBookmark, FiExternalLink, FiLoader } from "react-icons/fi";
import "../styles/DashboardPage.css";

function PaperCard({
  title,
  source,
  authors,
  year,
  tag,
  href,
  saved = false,
  onBookmark,
}) {
  const [bookmarking, setBookmarking] = useState(false);
  const metadata = [authors, year].filter(Boolean).join(" · ");

  async function handleBookmark() {
    if (bookmarking || !onBookmark) return;
    setBookmarking(true);
    try {
      await onBookmark();
    } finally {
      setBookmarking(false);
    }
  }

  return (
    <article className="db-paper-card">
      <div className="db-paper-main">
        <div className="db-paper-heading">
          {tag && <span className="db-paper-tag">{tag}</span>}
          <span className="db-paper-source">{source}</span>
        </div>
        <h3>{title}</h3>
        {metadata && <p>{metadata}</p>}
      </div>

      <div className="db-paper-actions">
        <button
          type="button"
          className={saved ? "is-saved" : ""}
          aria-label={saved ? "Remove from bookmarks" : "Save to bookmarks"}
          onClick={handleBookmark}
          disabled={bookmarking}
          title={saved ? "Saved to bookmarks" : "Save to bookmarks"}
        >
          {bookmarking ? (
            <FiLoader className="is-spinning" />
          ) : (
            <FiBookmark />
          )}
        </button>

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label="Open paper in new tab"
            title="Open paper"
          >
            <FiExternalLink />
          </a>
        )}
      </div>
    </article>
  );
}

export default PaperCard;
