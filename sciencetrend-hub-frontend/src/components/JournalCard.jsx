import { useState } from "react";
import { Link } from "react-router-dom";
import { FiBookOpen, FiCheckCircle, FiExternalLink, FiMinusCircle, FiLoader } from "react-icons/fi";
import "../styles/DashboardPage.css";

function JournalCard({
  name,
  publisher,
  subject,
  quartile,
  impactFactor,
  openAccess = false,
  detailPath,
  onUnfollow,
}) {
  const [unfollowing, setUnfollowing] = useState(false);
  const ContentWrapper = detailPath ? Link : "div";

  async function handleUnfollow() {
    if (unfollowing || !onUnfollow) return;
    setUnfollowing(true);
    try {
      await onUnfollow();
    } catch {
      setUnfollowing(false);
    }
  }

  return (
    <article className="db-journal-card">
      <ContentWrapper
        className="db-saved-entity-link"
        {...(detailPath ? { to: detailPath, title: `Open ${name}` } : {})}
      >
        <span className="db-journal-icon">
          <FiBookOpen aria-hidden="true" />
        </span>

        <div className="db-journal-content">
          <div className="db-journal-title-row">
            <div>
              <h3>{name}</h3>
              {publisher && <p>{publisher}</p>}
            </div>
            {quartile && <span className="db-quartile">{quartile}</span>}
          </div>

          <div className="db-journal-meta">
            {subject && <span>{subject}</span>}
            {impactFactor && <span>Impact factor {impactFactor}</span>}
            {openAccess && (
              <span className="db-open-access">
                <FiCheckCircle aria-hidden="true" /> Open access
              </span>
            )}
          </div>
        </div>
        {detailPath && <FiExternalLink className="db-saved-entity-open-icon" aria-hidden="true" />}
      </ContentWrapper>

      {onUnfollow && (
        <button
          type="button"
          className="db-journal-untrack-btn"
          onClick={handleUnfollow}
          disabled={unfollowing}
          title="Untrack journal"
        >
          {unfollowing ? <FiLoader className="is-spinning" /> : <FiMinusCircle />}
        </button>
      )}
    </article>
  );
}

export default JournalCard;
