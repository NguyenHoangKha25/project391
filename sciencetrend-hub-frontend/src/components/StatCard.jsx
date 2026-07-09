import { FiArrowDownRight, FiArrowUpRight, FiMinus } from "react-icons/fi";
import "../styles/DashboardPage.css";

function StatCard({
  title,
  value,
  change,
  description,
  icon: Icon,
  trend = "positive",
}) {
  const TrendIcon =
    trend === "negative"
      ? FiArrowDownRight
      : trend === "neutral"
        ? FiMinus
        : FiArrowUpRight;

  return (
    <article className="db-stat-card">
      <div className="db-stat-card-top">
        <span className="db-stat-icon">
          {Icon && <Icon aria-hidden="true" />}
        </span>
        {change && (
          <span className={`db-stat-change ${trend}`}>
            <TrendIcon aria-hidden="true" />
            {change}
          </span>
        )}
      </div>

      <p>{title}</p>
      <strong>{value}</strong>
      {description && <small>{description}</small>}
    </article>
  );
}

export default StatCard;
