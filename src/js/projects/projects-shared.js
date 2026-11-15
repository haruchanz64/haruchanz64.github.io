import { readCache, writeCache } from "../core/cache.js";

/**
 * Render a list of project items into `grid` using a shared `.project-card` DOM structure.
 * @template T
 * @param {{
 *   grid: HTMLElement,
 *   items: T[],
 *   emptyMessage: string,
 *   mapItem: (item: T) => {
 *     url: string,
 *     title: string,
 *     description: string,
 *     image?: string,
 *     imageAlt?: string,
 *     tags?: Array<{ className: string, text: string }>,
 *     onImage?: (img: HTMLImageElement) => void,
 *   },
 * }} options
 */
export function renderProjectGrid({ grid, items, emptyMessage, mapItem }) {
  if (!Array.isArray(items) || items.length === 0) {
    grid.innerHTML = `<p class="loading-text">${emptyMessage}</p>`;
    return;
  }

  grid.innerHTML = "";

  items.forEach((item) => {
    const { url, title, description, image, imageAlt, tags = [], onImage } = mapItem(item);

    const card = document.createElement("a");
    card.href = url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = "project-card uniform";

    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = imageAlt || title;
      img.className = "project-thumb";
      img.loading = "lazy";
      card.appendChild(img);
      onImage?.(img);
    }

    const info = document.createElement("div");
    info.className = "project-info";

    const titleEl = document.createElement("h3");
    titleEl.className = "project-title";
    titleEl.textContent = title;
    info.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = "project-description";
    descEl.textContent = description;
    info.appendChild(descEl);

    const meta = document.createElement("div");
    meta.className = "project-meta";
    tags.forEach(({ className, text }) => {
      const span = document.createElement("span");
      span.className = className;
      span.textContent = text;
      meta.appendChild(span);
    });

    info.appendChild(meta);
    card.appendChild(info);
    grid.appendChild(card);
    if (window.observeReveal) window.observeReveal(card);
  });
}

/**
 * Load array data from fresh cache, falling back to `fetchPrimary`, stale cache, and optional `fetchFallback`.
 * @template T
 * @param {{
 *   cacheKey: string,
 *   ttlMs: number,
 *   fetchPrimary: () => Promise<T[]>,
 *   fetchFallback?: () => Promise<T[]>,
 *   label: string,
 * }} options
 * @returns {Promise<T[] | null>}
 */
export async function loadCachedList({ cacheKey, ttlMs, fetchPrimary, fetchFallback, label }) {
  const cached = readCache(cacheKey, ttlMs);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

  try {
    const items = await fetchPrimary();
    writeCache(cacheKey, items);
    return items;
  } catch (err) {
    console.warn(`${label} unavailable, checking fallback:`, err.message);
    const stale = readCache(cacheKey, ttlMs, true);
    if (Array.isArray(stale) && stale.length > 0) {
      return stale;
    }

    if (fetchFallback) {
      try {
        const fallback = await fetchFallback();
        writeCache(cacheKey, fallback);
        return fallback;
      } catch (fallbackErr) {
        console.error(`Failed to load ${label}:`, fallbackErr);
      }
    } else {
      console.error(`Failed to load ${label}:`, err);
    }
    return null;
  }
}
