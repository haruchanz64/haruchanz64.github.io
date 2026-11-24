import { readCache, writeCache } from "../core/cache.js";

const PROJECT_CARD_CLASS =
  "project-card group flex flex-col items-stretch min-w-0 bg-card-bg border border-border rounded-brand p-5 transition-[border-color,box-shadow,transform,translate,opacity] duration-300 ease-in-out w-full max-w-full mx-auto no-underline text-inherit text-left font-main cursor-pointer hover:border-accent hover:shadow-card-hover hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
const PROJECT_THUMB_CLASS =
  "w-full aspect-video object-cover rounded-[6px] mb-4 shadow-[0_1px_4px_color-mix(in_srgb,var(--first-color)_15%,transparent)]";
const PROJECT_INFO_CLASS = "w-full min-w-0 flex-1 flex flex-col text-left";
const PROJECT_META_ROW_CLASS = "flex items-center justify-between gap-2 mb-2.5 min-w-0";
const PROJECT_CATEGORY_CLASS =
  "font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-text-secondary/75 truncate";
const PROJECT_DATE_CLASS =
  "font-mono text-[0.7rem] tabular-nums text-text-secondary/70 whitespace-nowrap shrink-0";
const PROJECT_TITLE_CLASS =
  "font-display text-[1.05rem] leading-[1.3] tracking-[-0.01em] font-semibold mb-2 text-accent wrap-break-word";
const PROJECT_DESC_CLASS = "text-[0.9rem] leading-[1.55] text-text-secondary/90 mb-4 flex-1";
const PROJECT_TAGS_CLASS = "flex flex-wrap gap-1.5 mb-4";
const PROJECT_TAG_CLASS =
  "font-mono text-[0.7rem] leading-tight px-2 py-0.5 rounded-[5px] bg-bg-tertiary/80 border border-border/70 text-text-secondary/85 whitespace-nowrap";
const PROJECT_FOOTER_CLASS =
  "pt-2.5 border-t border-border/45 flex items-center justify-between gap-2";
const PROJECT_CUE_CLASS =
  "font-mono text-[0.78rem] font-medium text-text-secondary whitespace-nowrap self-start transition-colors duration-300 ease-in-out group-hover:text-accent";

function appendBreakableTitle(element, title) {
  const parts = String(title ?? "").split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/);
  parts.forEach((part, index) => {
    if (index > 0) {
      element.appendChild(document.createElement("wbr"));
    }
    element.appendChild(document.createTextNode(part));
  });
}

/**
 * Render a list of project items into `grid` using a shared `.project-card` DOM structure.
 * @template T
 * @param {{
 *   grid: HTMLElement,
 *   items: T[],
 *   emptyMessage: string,
 *   append?: boolean,
 *   mapItem: (item: T) => {
 *     url: string,
 *     title: string,
 *     description: string,
 *     image?: string,
 *     imageAlt?: string,
 *     cueLabel?: string,
 *     onImage?: (img: HTMLImageElement) => void,
 *     onSelect?: (triggerEl: HTMLElement) => void,
 *   },
 * }} options
 * @returns {HTMLElement[]}
 */
export function renderProjectGrid({ grid, items, emptyMessage, append = false, mapItem }) {
  if (!Array.isArray(items) || items.length === 0) {
    if (!append) {
      grid.innerHTML = `<p class="col-span-full text-text-secondary">${emptyMessage}</p>`;
    }
    return [];
  }

  if (!append) {
    grid.innerHTML = "";
  }

  const cards = [];

  items.forEach((item) => {
    const {
      url,
      title,
      description,
      category,
      dateLabel,
      dateTime,
      tags,
      image,
      imageAlt,
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

    if (category || dateLabel) {
      const metaRow = document.createElement("div");
      metaRow.className = PROJECT_META_ROW_CLASS;

      if (category) {
        const categoryEl = document.createElement("span");
        categoryEl.className = PROJECT_CATEGORY_CLASS;
        categoryEl.textContent = category;
        metaRow.appendChild(categoryEl);
      }

      if (dateLabel) {
        const timeEl = document.createElement("time");
        timeEl.className = PROJECT_DATE_CLASS;
        if (dateTime) timeEl.setAttribute("datetime", dateTime);
        timeEl.textContent = dateLabel;
        metaRow.appendChild(timeEl);
      }

      info.appendChild(metaRow);
    }

    const titleEl = document.createElement("h3");
    titleEl.className = PROJECT_TITLE_CLASS;
    appendBreakableTitle(titleEl, title);
    info.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = PROJECT_DESC_CLASS;
    descEl.textContent = description;
    info.appendChild(descEl);

    if (Array.isArray(tags) && tags.length > 0) {
      const tagsEl = document.createElement("div");
      tagsEl.className = PROJECT_TAGS_CLASS;
      for (const tag of tags.slice(0, 3)) {
        const tagEl = document.createElement("span");
        tagEl.className = PROJECT_TAG_CLASS;
        tagEl.textContent = tag;
        tagsEl.appendChild(tagEl);
      }
      info.appendChild(tagsEl);
    }

    if (cueLabel) {
      const footer = document.createElement("div");
      footer.className = PROJECT_FOOTER_CLASS;
      const cue = document.createElement("span");
      cue.className = PROJECT_CUE_CLASS;
      cue.textContent = cueLabel;
      cue.setAttribute("aria-hidden", "true");
      footer.appendChild(cue);
      info.appendChild(footer);
    }

    card.appendChild(info);
    grid.appendChild(card);
    cards.push(card);
    if (window.observeReveal) window.observeReveal(card);
  });

  return cards;
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
