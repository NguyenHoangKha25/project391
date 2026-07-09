export function formatNumber(value, options = {}) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US", options).format(number);
}

export function formatCompactNumber(value) {
  return formatNumber(value, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export default formatNumber;
