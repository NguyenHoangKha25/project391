/**
 * Formats a Date object or date-string into a clean, human-readable format.
 * 
 * @param {Date|string|number} value - The input date value to format.
 * @param {Intl.DateTimeFormatOptions} [options={}] - Custom Intl.DateTimeFormat configuration overrides.
 * @returns {string} The formatted localized date string, or a placeholder if invalid.
 */
export function formatDate(value, options = {}) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export default formatDate;
