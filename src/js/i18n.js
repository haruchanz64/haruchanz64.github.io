import en from "../locales/en.json" with { type: "json" };
import fil from "../locales/fil.json" with { type: "json" };
import jp from "../locales/jp.json" with { type: "json" };

export const LOCALES = { en, fil, jp };
export const SUPPORTED_LOCALES = ["en", "fil", "jp"];
export const DEFAULT_LOCALE = "en";

const HTML_LANG_MAP = {
  en: "en",
  fil: "fil",
  jp: "ja",
};

/**
 * Normalize a BCP-47 language tag (e.g. "ja-JP", "fil-PH", "tl") to a supported locale key.
 * @param {string | null | undefined} tag
 * @returns {"en" | "fil" | "jp" | null}
 */
export function normalizeLocaleTag(tag) {
  if (!tag || typeof tag !== "string") return null;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (base === "ja" || base === "jp") return "jp";
  if (base === "fil" || base === "tl") return "fil";
  if (base === "en") return "en";
  return null;
}

/**
 * Detect the best matching supported locale from the browser's navigator language preferences.
 * @param {{ languages?: readonly string[], language?: string, userLanguage?: string } | null} nav
 * @returns {"en" | "fil" | "jp"}
 */
export function detectBrowserLocale(
  nav = typeof navigator !== "undefined" ? navigator : null,
) {
  if (!nav) return DEFAULT_LOCALE;

  const candidates = [];
  if (Array.isArray(nav.languages) && nav.languages.length > 0) {
    candidates.push(...nav.languages);
  }
  if (nav.language) candidates.push(nav.language);
  if (nav.userLanguage) candidates.push(nav.userLanguage);

  for (const candidate of candidates) {
    const matched = normalizeLocaleTag(candidate);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}

/**
 * Resolve the active locale from an optional `?lang=` query parameter or browser preferences.
 * @param {{ search?: string, nav?: { languages?: readonly string[], language?: string, userLanguage?: string } | null }} [options]
 * @returns {"en" | "fil" | "jp"}
 */
export function resolveLocale({
  search = typeof window !== "undefined" ? window.location.search : "",
  nav = typeof navigator !== "undefined" ? navigator : null,
} = {}) {
  if (search) {
    try {
      const langParam = new URLSearchParams(search).get("lang");
      const matched = normalizeLocaleTag(langParam);
      if (matched) return matched;
    } catch {
      // Ignore malformed query strings and fall back to browser detection.
    }
  }
  return detectBrowserLocale(nav);
}

function lookupKey(dict, key) {
  if (!dict || !key) return undefined;
  return key.split(".").reduce((acc, part) => (acc && part in acc ? acc[part] : undefined), dict);
}

/**
 * Look up a translation key in the specified locale, falling back to English.
 * @param {"en" | "fil" | "jp"} locale
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function getTranslation(locale, key, params) {
  const dict = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
  let value = lookupKey(dict, key);
  if (value === undefined && locale !== DEFAULT_LOCALE) {
    value = lookupKey(LOCALES[DEFAULT_LOCALE], key);
  }
  if (typeof value !== "string") return key;

  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
    );
  }
  return value;
}

let currentLocale = resolveLocale();

/**
 * Return the currently active locale key.
 * @returns {"en" | "fil" | "jp"}
 */
export function getCurrentLocale() {
  return currentLocale;
}

/**
 * Set the active locale key.
 * @param {"en" | "fil" | "jp"} locale
 */
export function setCurrentLocale(locale) {
  currentLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * Translate a key using the currently active locale.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params) {
  return getTranslation(currentLocale, key, params);
}

/**
 * Apply translations for `locale` to all annotated elements in `doc`.
 * @param {Document} [doc]
 * @param {"en" | "fil" | "jp"} [locale]
 */
export function applyI18n(doc = document, locale = currentLocale) {
  setCurrentLocale(locale);
  if (!doc) return;

  if (doc.documentElement) {
    doc.documentElement.lang = HTML_LANG_MAP[currentLocale] ?? "en";
  }

  const title = getTranslation(currentLocale, "meta.title");
  if (title && title !== "meta.title") {
    doc.title = title;
  }

  doc.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = getTranslation(currentLocale, key);
  });

  doc.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = getTranslation(currentLocale, key);
  });

  doc.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", getTranslation(currentLocale, key));
  });

  doc.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) el.setAttribute("aria-label", getTranslation(currentLocale, key));
  });

  doc.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const key = el.getAttribute("data-i18n-alt");
    if (key) el.setAttribute("alt", getTranslation(currentLocale, key));
  });

  doc.querySelectorAll("[data-i18n-content]").forEach((el) => {
    const key = el.getAttribute("data-i18n-content");
    if (key) el.setAttribute("content", getTranslation(currentLocale, key));
  });
}

if (typeof document !== "undefined") {
  const init = () => applyI18n(document, resolveLocale());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
