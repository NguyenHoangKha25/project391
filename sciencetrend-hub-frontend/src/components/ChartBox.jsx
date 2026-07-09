import { formatNumber, toNumber } from "../utils/apiData";
import "../styles/DashboardPage.css";

function ChartBox({
  title,
  subtitle,
  data = [],
  valueSuffix = "",
  rangeLabel,
  emptyMessage = "No chart data returned from the backend yet.",
}) {
  const safeData = Array.isArray(data)
    ? data.filter((item) => item && item.label !== undefined)
    : [];
  const maxValue = Math.max(...safeData.map((item) => toNumber(item.value)), 1);

  return (
    <article className="db-panel db-chart-panel">
      <div className="db-panel-header">
        <div>
          {subtitle && <span className="db-eyebrow">{subtitle}</span>}
          <h2>{title}</h2>
        </div>
        {rangeLabel && <span className="db-range-badge">{rangeLabel}</span>}
      </div>

      {safeData.length === 0 ? (
        <div className="db-chart-empty">{emptyMessage}</div>
      ) : (
        /* Scroll wrapper handles overflow when there are many bars */
        <div className="db-chart-scroll-wrapper">
          <div
            className="db-chart"
            role="img"
            aria-label={`${title} bar chart`}
            /* Ensure min-width grows with number of columns: 36px + 8px gap per column */
            style={{ minWidth: safeData.length * 96 }}
          >
            <div className="db-chart-grid" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            {safeData.map((item) => {
              const value = toNumber(item.value);
              const heightPct = Math.max((value / maxValue) * 100, 6);

              return (
                <div className="db-chart-column" key={item.label}>
                  <span className="db-chart-value">
                    {formatNumber(value)}
                    {valueSuffix}
                  </span>
                  <div className="db-chart-track">
                    <span style={{ height: `${heightPct}%` }} />
                  </div>
                  <small title={item.label}>{item.label}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

export default ChartBox;
