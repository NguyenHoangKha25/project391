// Simple memory cache for API responses to enable instant page loads during navigation
const cache = {};
const PERSISTENT_CACHE_KEY = "sciencetrend_api_cache_v1";
const MAX_PERSISTENT_ENTRIES = 80;
let persistentCache = null;

function loadPersistentCache() {
  if (persistentCache) return persistentCache;

  persistentCache = {};
  if (typeof window === "undefined") return persistentCache;

  try {
    const stored = window.localStorage.getItem(PERSISTENT_CACHE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      persistentCache = parsed;
    }
  } catch {
    // Keep the in-memory fallback when storage is unavailable or corrupted.
  }

  return persistentCache;
}

function savePersistentCache() {
  if (typeof window === "undefined") return;

  const entries = Object.entries(loadPersistentCache())
    .sort(([, a], [, b]) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0))
    .slice(0, MAX_PERSISTENT_ENTRIES);

  persistentCache = Object.fromEntries(entries);

  try {
    window.localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify(persistentCache));
  } catch {
    // Memory caching still works when the browser blocks or fills localStorage.
  }
}

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

// Persistent cache is intended for public, reusable data that should survive
// reloads. It returns stale data by default so callers can revalidate it in the
// background without leaving the page empty when the API is unavailable.
export function getPersistentCachedData(key, maxAgeMs = Number.POSITIVE_INFINITY) {
  const entry = loadPersistentCache()[key];
  if (!entry || !Object.prototype.hasOwnProperty.call(entry, "data")) return null;

  const age = Date.now() - (Number(entry.timestamp) || 0);
  if (age > maxAgeMs) return null;

  return entry.data;
}

export function setPersistentCachedData(key, data) {
  loadPersistentCache()[key] = {
    data,
    timestamp: Date.now(),
  };
  savePersistentCache();
}

export function clearPersistentCache(key) {
  const storedCache = loadPersistentCache();
  if (key) {
    delete storedCache[key];
  } else {
    persistentCache = {};
  }
  savePersistentCache();
}

export function clearCache(key) {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
  }
}
