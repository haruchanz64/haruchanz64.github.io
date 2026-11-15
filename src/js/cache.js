/**
 * Read a JSON value from localStorage if present and within ttlMs (or stale when allowed).
 * @param {string} key
 * @param {number} ttlMs
 * @param {boolean} [allowStale=false]
 * @returns {unknown | null}
 */
export function readCache(key, ttlMs, allowStale = false) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== "number" || !("data" in parsed)) {
      return null;
    }
    if (!allowStale && Date.now() - parsed.timestamp > ttlMs) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Store a JSON-serializable value with a timestamp in localStorage.
 * @param {string} key
 * @param {unknown} data
 */
export function writeCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ timestamp: Date.now(), data }),
    );
  } catch {
    // Ignore quota or storage errors in restricted browsing contexts.
  }
}
