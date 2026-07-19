// Simple memory cache for API responses to enable instant page loads during navigation
const cache = {};

export function getCachedData(key, maxAgeMs = 120000) { // Default 2 minutes
  const entry = cache[key];
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > maxAgeMs) {
    delete cache[key];
    return null;
  }

  return entry.data;
}

export function setCachedData(key, data) {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}

export function clearCache(key) {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
  }
}
