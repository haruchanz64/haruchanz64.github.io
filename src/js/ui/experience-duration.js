import { onDomReady } from "../core/dom.js";

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/**
 * Parse a "Month YYYY" string or "Present" into { year, month } (0-indexed month).
 */
export function parseMonthYear(token, now = new Date()) {
  const trimmed = String(token ?? "").trim();
  if (!trimmed) return null;

  if (/^present$/i.test(trimmed)) {
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  const match = /^([a-z]+)\s+(\d{4})$/i.exec(trimmed);
  if (!match) return null;

  const month = MONTHS[match[1].toLowerCase()];
  if (month === undefined) return null;

  return { year: Number(match[2]), month };
}

/**
 * Format an inclusive month count into "X yrs Y mos", "X yr", or "Y mos".
 */
export function formatDuration(totalMonths) {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) return "";

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];

  if (years > 0) parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mo" : "mos"}`);

  return parts.join(" ");
}

/**
 * Compute an inclusive duration string from a "Start – End" date range.
 */
export function computeExperienceDuration(dateRangeText, now = new Date()) {
  const parts = String(dateRangeText ?? "").split(/\s*[–—-]\s*/);
  if (parts.length !== 2) return "";

  const start = parseMonthYear(parts[0], now);
  const end = parseMonthYear(parts[1], now);
  if (!start || !end) return "";

  const totalMonths = (end.year - start.year) * 12 + (end.month - start.month) + 1;
  return formatDuration(totalMonths);
}

/**
 * Append calculated durations to `.experience-date` elements in `#experience`.
 */
export function applyExperienceDurations(root = document, now = new Date()) {
  const dateEls = root.querySelectorAll("#experience .experience-date");
  for (const el of dateEls) {
    const raw = el.dataset.dateRange ?? el.textContent.trim();
    el.dataset.dateRange = raw;

    const duration = computeExperienceDuration(raw, now);
    if (duration) {
      const displayRange = el.textContent.trim().split(" · ")[0] || raw;
      el.textContent = `${displayRange} · ${duration}`;
    }
  }
}

void onDomReady(() => applyExperienceDurations());
