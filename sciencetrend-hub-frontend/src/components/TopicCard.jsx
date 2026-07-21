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

  return (
    <article className="db-topic-card" style={{ position: "relative" }}>
      <span className="db-topic-rank">{String(rank).padStart(2, "0")}</span>

      <div className="db-topic-content" style={{ paddingRight: onUnfollow ? "40px" : "0" }}>
        <div className="db-topic-heading">
          <div>
            <strong>{name}</strong>
            <small>{paperCount}</small>
          </div>
          <span className="db-topic-growth">
            <FiTrendingUp aria-hidden="true" />
            {growth}
          </span>
        </div>

        <div className="db-topic-progress" aria-label={`${name} score ${safeScore}%`}>
          <span style={{ width: `${safeScore}%` }} />
        </div>
      </div>

      {onUnfollow && (
        <button
          type="button"
          onClick={handleUnfollow}
          disabled={unfollowing}
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "var(--st-danger, #ef4444)",
            cursor: "pointer",
            fontSize: "18px",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Untrack topic"
        >
          {unfollowing ? <FiLoader className="is-spinning" /> : <FiMinusCircle />}
        </button>
      )}
    </article>
  );
}

export default TopicCard;
