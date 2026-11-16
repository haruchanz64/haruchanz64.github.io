export const ASSET_CACHE_PREFIX = "haru_asset_v1:";
export const CACHE_STORAGE_NAME = "haru-portfolio-assets-v1";

const inFlightAssetLoads = new Map();

function getDefaultStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
      ? window.localStorage
      : null;
  } catch {
    return null;
  }
}

function getDefaultCaches() {
  try {
    return typeof caches !== "undefined" ? caches : null;
  } catch {
    return null;
  }
}

/**
 * Safely read a raw string value from Web Storage.
 * @param {string} key
 * @param {Storage | null} [storage]
 * @returns {string | null}
 */
export function readStorageItem(key, storage = getDefaultStorage()) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/**
 * Safely write a raw string value to Web Storage, ignoring quota/restricted-mode errors.
 * @param {string} key
 * @param {string} value
 * @param {Storage | null} [storage]
 * @returns {boolean}
 */
export function writeStorageItem(key, value, storage = getDefaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON value from localStorage if present and within ttlMs (or stale when allowed).
 * @param {string} key
 * @param {number} [ttlMs]
 * @param {boolean} [allowStale=false]
 * @param {Storage | null} [storage]
 * @returns {unknown | null}
 */
export function readCache(
  key,
  ttlMs = Number.POSITIVE_INFINITY,
  allowStale = false,
  storage = getDefaultStorage(),
) {
  try {
    const raw = readStorageItem(key, storage);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== "number" || !("data" in parsed)) {
      return null;
    }
    if (!allowStale && Number.isFinite(ttlMs) && Date.now() - parsed.timestamp > ttlMs) {
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
 * @param {Storage | null} [storage]
 */
export function writeCache(key, data, storage = getDefaultStorage()) {
  try {
    writeStorageItem(key, JSON.stringify({ timestamp: Date.now(), data }), storage);
  } catch {
    // Ignore serialization errors.
  }
}

/**
 * Read a cached data URL for an image or devicon from localStorage.
 * @param {string} url
 * @param {Storage | null} [storage]
 * @returns {string | null}
 */
export function readCachedAssetDataUrl(url, storage = getDefaultStorage()) {
  if (!url || typeof url !== "string") return null;
  const raw = readStorageItem(`${ASSET_CACHE_PREFIX}${url}`, storage);
  return raw?.startsWith("data:") ? raw : null;
}

/**
 * Save a data URL for an image or devicon into localStorage.
 * @param {string} url
 * @param {string} dataUrl
 * @param {Storage | null} [storage]
 * @returns {boolean}
 */
export function writeCachedAssetDataUrl(url, dataUrl, storage = getDefaultStorage()) {
  if (!url || !dataUrl?.startsWith("data:")) return false;
  return writeStorageItem(`${ASSET_CACHE_PREFIX}${url}`, dataUrl, storage);
}

/**
 * Convert a Blob or Response body into a base64 data URL.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export async function blobToDataUrl(blob) {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to data URL"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  }

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(buffer).toString("base64");
  const mime = blob.type || "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}

async function responseToCachedDataUrl(url, response, storage) {
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  writeCachedAssetDataUrl(url, dataUrl, storage);
  return dataUrl;
}

/**
 * Fetch and cache an asset (image, devicon SVG, icon) in both localStorage and CacheStorage.
 * Returns a `data:` URL when readable via CORS/same-origin, or the original URL if opaque.
 * @param {string} url
 * @param {{
 *   storage?: Storage | null,
 *   cachesApi?: CacheStorage | null,
 *   fetchImpl?: typeof fetch | null
 * }} [options]
 * @returns {Promise<string>}
 */
export async function cacheAssetUrl(
  url,
  {
    storage = getDefaultStorage(),
    cachesApi = getDefaultCaches(),
    fetchImpl = typeof fetch === "function" ? fetch.bind(globalThis) : null,
  } = {},
) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const existingLocal = readCachedAssetDataUrl(url, storage);
  if (existingLocal) return existingLocal;
  if (inFlightAssetLoads.has(url)) return inFlightAssetLoads.get(url);

  const loadPromise = (async () => {
    let cacheBox = null;
    try {
      if (cachesApi?.open) {
        cacheBox = await cachesApi.open(CACHE_STORAGE_NAME).catch(() => null);
        const matched = await cacheBox?.match(url).catch(() => null);
        if (matched?.ok && matched.type !== "opaque") {
          return await responseToCachedDataUrl(url, matched, storage);
        }
      }

      if (!fetchImpl) return url;

      const isCrossOrigin =
        /^https?:\/\//i.test(url) &&
        typeof location !== "undefined" &&
        !url.startsWith(location.origin);

      const response = await fetchImpl(
        url,
        isCrossOrigin ? { mode: "cors", credentials: "omit" } : undefined,
      );

      if (response?.ok && response.type !== "opaque") {
        await cacheBox?.put(url, response.clone()).catch(() => {});
        return await responseToCachedDataUrl(url, response, storage);
      }
    } catch {
      // If CORS fetch fails on a third-party image host, cache an opaque response in CacheStorage.
      if (cacheBox && fetchImpl) {
        try {
          const existing = await cacheBox.match(url);
          if (!existing) {
            const opaqueRes = await fetchImpl(url, { mode: "no-cors" });
            if (opaqueRes) await cacheBox.put(url, opaqueRes);
          }
        } catch {
          // Ignore fallback errors.
        }
      }
    }
    return url;
  })().finally(() => {
    inFlightAssetLoads.delete(url);
  });

  inFlightAssetLoads.set(url, loadPromise);
  return loadPromise;
}

async function hydrateElementAsset(
  el,
  { attr, datasetKey, applyUrl, onlyDataUrl = false },
  options = {},
) {
  if (!el) return "";
  const originalUrl = el.dataset?.[datasetKey] || el.getAttribute?.(attr) || el[attr] || "";
  if (!originalUrl || originalUrl.startsWith("data:") || originalUrl.startsWith("blob:")) {
    return originalUrl;
  }

  if (el.dataset) {
    el.dataset[datasetKey] = originalUrl;
  }

  const storage = options.storage !== undefined ? options.storage : getDefaultStorage();
  const syncDataUrl = readCachedAssetDataUrl(originalUrl, storage);
  if (syncDataUrl) {
    applyUrl(el, syncDataUrl);
    return syncDataUrl;
  }

  const resolvedUrl = await cacheAssetUrl(originalUrl, options);
  if (resolvedUrl && (!onlyDataUrl || resolvedUrl.startsWith("data:"))) {
    applyUrl(el, resolvedUrl);
  }
  return resolvedUrl;
}

/**
 * Hydrate an `<img>` element from user storage (localStorage / CacheStorage) or fetch & persist it.
 * @param {HTMLImageElement} img
 * @param {Parameters<typeof cacheAssetUrl>[1]} [options]
 * @returns {Promise<string>}
 */
export function cacheImageElement(img, options = {}) {
  return hydrateElementAsset(
    img,
    {
      attr: "src",
      datasetKey: "originalSrc",
      applyUrl: (el, url) => {
        if (el.src !== url) el.src = url;
      },
    },
    options,
  );
}

/**
 * Cache all images, devicons, and icons in `doc` into user storage (localStorage + CacheStorage).
 * @param {Document} [doc]
 * @param {Parameters<typeof cacheAssetUrl>[1]} [options]
 * @returns {Promise<string[]>}
 */
export function cacheAllDocumentAssets(
  doc = typeof document !== "undefined" ? document : null,
  options = {},
) {
  if (!doc) return Promise.resolve([]);

  const tasks = [];
  (doc.querySelectorAll?.("img[src]") || []).forEach((img) => {
    tasks.push(cacheImageElement(img, options));
  });

  (doc.querySelectorAll?.('link[rel*="icon"][href]') || []).forEach((link) => {
    tasks.push(
      hydrateElementAsset(
        link,
        {
          attr: "href",
          datasetKey: "originalHref",
          onlyDataUrl: true,
          applyUrl: (el, url) => el.setAttribute("href", url),
        },
        options,
      ),
    );
  });

  return Promise.all(tasks);
}

/**
 * Register the portfolio Service Worker to cache images, devicons, fonts, and static assets in CacheStorage.
 */
export function registerAssetCacheServiceWorker() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (
    location.protocol !== "https:" &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"
  ) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Ignore service worker registration errors in unsupported/dev environments.
    });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
