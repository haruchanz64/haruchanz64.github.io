import { readCache, writeCache } from "../core/cache.js";

const PROJECT_CARD_CLASS =
  "project-card flex flex-col items-center bg-card-bg border border-border rounded-brand px-4 py-6 transition-[border-color,box-shadow,transform,translate,opacity] duration-300 ease-in-out w-full max-w-full mx-auto no-underline text-inherit hover:border-accent hover:shadow-card-hover hover:-translate-y-1";
const PROJECT_THUMB_CLASS =
  "w-full aspect-video object-cover rounded-[6px] mb-4 shadow-[0_1px_4px_color-mix(in_srgb,var(--first-color)_15%,transparent)]";
const PROJECT_INFO_CLASS = "w-full text-left";
const PROJECT_TITLE_CLASS = "font-display text-[1.15rem] font-semibold mb-2 text-accent";
const PROJECT_DESC_CLASS = "text-[0.97rem] text-text-secondary mb-3";
const PROJECT_META_CLASS =
  "text-[0.85rem] mt-2 pt-2 border-t border-border/25 opacity-85 flex flex-wrap gap-[6px]";
const PROJECT_TAG_CLASS =
  "font-mono bg-bg-tertiary text-accent px-2 py-0.5 rounded-[4px] font-medium text-[0.85em]";

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
    grid.innerHTML = `<p class="text-text-secondary">${emptyMessage}</p>`;
    return;
  }

  grid.innerHTML = "";

  items.forEach((item) => {
    const { url, title, description, image, imageAlt, tags = [], onImage } = mapItem(item);

    const card = document.createElement("a");
    card.href = url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = PROJECT_CARD_CLASS;

    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = imageAlt || title;
      img.className = PROJECT_THUMB_CLASS;
      img.loading = "lazy";
      card.appendChild(img);
      onImage?.(img);
    }

    const info = document.createElement("div");
    info.className = PROJECT_INFO_CLASS;

    const titleEl = document.createElement("h3");
    titleEl.className = PROJECT_TITLE_CLASS;
    titleEl.textContent = title;
    info.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = PROJECT_DESC_CLASS;
    descEl.textContent = description;
    info.appendChild(descEl);

    const meta = document.createElement("div");
    meta.className = PROJECT_META_CLASS;
    tags.forEach(({ className, text }) => {
      const span = document.createElement("span");
      span.className = className ? `${className} ${PROJECT_TAG_CLASS}` : PROJECT_TAG_CLASS;
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
