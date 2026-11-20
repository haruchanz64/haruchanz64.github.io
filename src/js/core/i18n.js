import en_us from "../../locales/en_us.json" with { type: "json" };
import { readCache, writeCache, writeStorageItem } from "./cache.js";
import { isMaintenanceMode, onDomReady } from "./dom.js";

export const LOCALES = { en_us };
export const SUPPORTED_LOCALES = ["en_us", "fil_ph", "ja_jp"];
export const DEFAULT_LOCALE = "en_us";
const LOCALE_CACHE_PREFIX = "haru_locale_dict_v4:";
const LOCALE_STORAGE_KEY = "haru_locale";

const isVite = typeof import.meta !== "undefined" && Boolean(import.meta.env);

const LOCALE_LOADERS = {
  fil_ph: () =>
    isVite
      ? import("../../locales/fil_ph.json")
      : import(/* @vite-ignore */ "../../locales/fil_ph.json", { with: { type: "json" } }),
  ja_jp: () =>
    isVite
      ? import("../../locales/ja_jp.json")
      : import(/* @vite-ignore */ "../../locales/ja_jp.json", { with: { type: "json" } }),
};

const pendingLocaleLoads = new Map();

/**
 * Lazy-load a locale dictionary into `LOCALES` if not already loaded.
 * @param {"en_us" | "fil_ph" | "ja_jp"} locale
 * @returns {Promise<Record<string, unknown>>}
 */
export async function loadLocale(locale) {
  const target = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  if (LOCALES[target]) return LOCALES[target];

  const cachedDict = readCache(`${LOCALE_CACHE_PREFIX}${target}`, Number.POSITIVE_INFINITY, true);
  if (cachedDict && typeof cachedDict === "object") {
    LOCALES[target] = cachedDict;
    return LOCALES[target];
  }

  if (!pendingLocaleLoads.has(target)) {
    const promise = LOCALE_LOADERS[target]()
      .then((mod) => {
        LOCALES[target] = mod.default ?? mod;
        writeCache(`${LOCALE_CACHE_PREFIX}${target}`, LOCALES[target]);
        return LOCALES[target];
      })
      .finally(() => {
        pendingLocaleLoads.delete(target);
      });
    pendingLocaleLoads.set(target, promise);
  }

  return pendingLocaleLoads.get(target);
}

const HTML_LANG_MAP = {
  en_us: "en",
  fil_ph: "fil",
  ja_jp: "ja",
};

/**
 * Normalize a Unicode or BCP-47 language tag (e.g. "en_us", "ja-JP", "fil-PH", "tl") to a supported locale key.
 * @param {string | null | undefined} tag
 * @returns {"en_us" | "fil_ph" | "ja_jp" | null}
 */
export function normalizeLocaleTag(tag) {
  if (!tag || typeof tag !== "string") return null;
  const base = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (base === "ja" || base === "jp") return "ja_jp";
  if (base === "fil" || base === "tl") return "fil_ph";
  if (base === "en") return "en_us";
  return null;
}

/**
 * Detect the best matching supported locale from the browser's navigator language preferences.
 * @param {{ languages?: readonly string[], language?: string, userLanguage?: string } | null} nav
 * @returns {"en_us" | "fil_ph" | "ja_jp"}
 */
export function detectBrowserLocale(nav = typeof navigator !== "undefined" ? navigator : null) {
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
 * Resolve the active locale from an optional `?locale=` or `?lang=` query parameter or browser preferences.
 * @param {{ search?: string, nav?: { languages?: readonly string[], language?: string, userLanguage?: string } | null }} [options]
 * @returns {"en_us" | "fil_ph" | "ja_jp"}
 */
export function resolveLocale({
  search = typeof window !== "undefined" ? window.location.search : "",
  nav = typeof navigator !== "undefined" ? navigator : null,
} = {}) {
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const localeParam = params.get("locale") ?? params.get("lang");
      const matched = normalizeLocaleTag(localeParam);
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
 * @param {"en_us" | "fil_ph" | "ja_jp"} locale
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
      Object.hasOwn(params, name) ? String(params[name]) : match,
    );
  }
  return value;
}

let currentLocale = resolveLocale();

/**
 * Return the currently active locale key.
 * @returns {"en_us" | "fil_ph" | "ja_jp"}
 */
export function getCurrentLocale() {
  return currentLocale;
}

/**
 * Set the active locale key.
 * @param {"en_us" | "fil_ph" | "ja_jp"} locale
 */
export function setCurrentLocale(locale) {
  currentLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  writeStorageItem(LOCALE_STORAGE_KEY, currentLocale);
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
 * @param {"en_us" | "fil_ph" | "ja_jp"} [locale]
 */
export function applyI18n(doc = document, locale = currentLocale) {
  setCurrentLocale(locale);
  if (!doc) return;

  if (doc.documentElement) {
    doc.documentElement.lang = HTML_LANG_MAP[currentLocale];
  }

  const titleKey = isMaintenanceMode(doc) ? "maintenance.metaTitle" : "meta.title";
  let title = getTranslation(currentLocale, titleKey);
  if (title === titleKey) {
    title = getTranslation(currentLocale, "meta.title");
  }
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

  for (const attr of ["placeholder", "aria-label", "alt", "content"]) {
    const dataAttr = `data-i18n-${attr}`;
    doc.querySelectorAll(`[${dataAttr}]`).forEach((el) => {
      const key = el.getAttribute(dataAttr);
      if (key) el.setAttribute(attr, getTranslation(currentLocale, key));
    });
  }
}

async function initI18n() {
  const locale = resolveLocale();
  if (locale !== DEFAULT_LOCALE) {
    await loadLocale(locale);
  }
  applyI18n(document, locale);
}

export const i18nReady = onDomReady(initI18n);
