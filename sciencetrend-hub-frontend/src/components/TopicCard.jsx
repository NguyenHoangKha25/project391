import { useState } from "react";
import { FiTrendingUp, FiMinusCircle, FiLoader } from "react-icons/fi";
import "../styles/DashboardPage.css";

function TopicCard({ rank, name, paperCount, growth, score = 0, onUnfollow }) {
  const safeScore = Math.min(Math.max(score, 0), 100);
  const [unfollowing, setUnfollowing] = useState(false);

  async function handleUnfollow() {
    if (unfollowing || !onUnfollow) return;
    setUnfollowing(true);
    try {
      await onUnfollow();
    } catch {
      setUnfollowing(false);
    }
  }

  const formattedRank = rank !== undefined && rank !== null && rank !== ""
    ? String(rank).padStart(2, "0")
    : null;

  return (
    <article className="db-topic-card">
      {formattedRank && <span className="db-topic-rank">{formattedRank}</span>}

      <div className="db-topic-content">
        <div className="db-topic-heading">
          <div>
            <strong>{name}</strong>
            {paperCount !== undefined && paperCount !== null && (
              <small className="db-topic-paper-count">{paperCount} papers</small>
            )}
          </div>
          {growth && (
            <span className="db-topic-growth">
              <FiTrendingUp aria-hidden="true" />
              {growth}
            </span>
          )}
        </div>

        {safeScore > 0 && (
          <div className="db-topic-progress" aria-label={`${name} score ${safeScore}%`}>
            <span style={{ width: `${safeScore}%` }} />
          </div>
        )}
      </div>

      {onUnfollow && (
        <button
          type="button"
          className="db-topic-untrack-btn"
          onClick={handleUnfollow}
          disabled={unfollowing}
          title="Untrack topic"
        >
          {unfollowing ? <FiLoader className="is-spinning" /> : <FiMinusCircle />}
        </button>
      )}
    </article>
  );
}

export default TopicCard;
