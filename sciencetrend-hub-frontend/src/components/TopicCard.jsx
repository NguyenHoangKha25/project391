import { FiTrendingUp } from "react-icons/fi";
import "../styles/DashboardPage.css";

function TopicCard({ rank, name, paperCount, growth, score = 0 }) {
  const safeScore = Math.min(Math.max(score, 0), 100);

  return (
    <article className="db-topic-card">
      <span className="db-topic-rank">{String(rank).padStart(2, "0")}</span>

      <div className="db-topic-content">
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
    </article>
  );
}

export default TopicCard;
