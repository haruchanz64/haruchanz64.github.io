import { readCache, writeCache } from "../core/cache.js";

const PROJECT_CARD_CLASS =
  "project-card group flex flex-col items-stretch bg-card-bg border border-border rounded-brand px-4 py-6 transition-[border-color,box-shadow,transform,translate,opacity] duration-300 ease-in-out w-full max-w-full mx-auto no-underline text-inherit text-left font-main cursor-pointer hover:border-accent hover:shadow-card-hover hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const PROJECT_THUMB_CLASS =
  "w-full aspect-video object-cover rounded-[6px] mb-4 shadow-[0_1px_4px_color-mix(in_srgb,var(--first-color)_15%,transparent)]";
const PROJECT_INFO_CLASS = "w-full flex-1 flex flex-col text-left";
const PROJECT_EYEBROW_CLASS =
  "font-mono text-[0.72rem] uppercase tracking-[0.08em] text-text-muted mb-1.5";
const PROJECT_TITLE_CLASS = "font-display text-[1.15rem] font-semibold mb-2 text-accent";
const PROJECT_DESC_CLASS = "text-[0.95rem] leading-[1.55] text-text-secondary mb-3 flex-1";
const PROJECT_META_CLASS =
  "text-[0.82rem] mt-2 pt-3 border-t border-border/25 flex items-center justify-between flex-wrap gap-2";
const PROJECT_TAGS_WRAP_CLASS = "flex flex-wrap gap-[6px] opacity-90";
const PROJECT_TAG_CLASS =
  "font-mono bg-bg-tertiary text-accent px-2 py-0.5 rounded-[4px] font-medium text-[0.85em]";
const PROJECT_CUE_CLASS =
  "font-mono text-[0.76rem] font-medium text-text-secondary whitespace-nowrap transition-colors duration-300 ease-in-out group-hover:text-accent";

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
 *     eyebrow?: string,
 *     description: string,
 *     image?: string,
 *     imageAlt?: string,
 *     tags?: Array<{ className: string, text: string }>,
 *     cueLabel?: string,
 *     onImage?: (img: HTMLImageElement) => void,
 *     onSelect?: (triggerEl: HTMLElement) => void,
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
    const {
      url,
      title,
      eyebrow,
      description,
      image,
      imageAlt,
      tags = [],
      cueLabel,
      onImage,
      onSelect,
    } = mapItem(item);

    const card = onSelect ? document.createElement("button") : document.createElement("a");
    if (onSelect) {
      card.type = "button";
      card.setAttribute("aria-haspopup", "dialog");
      card.addEventListener("click", () => onSelect(card));
    } else {
      card.href = url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }
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

    if (eyebrow) {
      const eyebrowEl = document.createElement("p");
      eyebrowEl.className = PROJECT_EYEBROW_CLASS;
      eyebrowEl.textContent = eyebrow;
      info.appendChild(eyebrowEl);
    }

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

    const tagsWrap = document.createElement("div");
    tagsWrap.className = PROJECT_TAGS_WRAP_CLASS;
    tags.forEach(({ className, text }) => {
      const span = document.createElement("span");
      span.className = className ? `${className} ${PROJECT_TAG_CLASS}` : PROJECT_TAG_CLASS;
      span.textContent = text;
      tagsWrap.appendChild(span);
    });
    meta.appendChild(tagsWrap);

    if (cueLabel) {
      const cue = document.createElement("span");
      cue.className = PROJECT_CUE_CLASS;
      cue.textContent = cueLabel;
      cue.setAttribute("aria-hidden", "true");
      meta.appendChild(cue);
    }

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
