import { before, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  LOCALES,
  SUPPORTED_LOCALES,
  applyI18n,
  detectBrowserLocale,
  getTranslation,
  loadLocale,
  normalizeLocaleTag,
  resolveLocale,
} from "../src/js/core/i18n.js";
import { applyExperienceDurations } from "../src/js/ui/experience-duration.js";

before(async () => {
  await Promise.all(SUPPORTED_LOCALES.map(loadLocale));
});

function collectKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...collectKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("locale JSON parity", () => {
  it("has identical keys across EN, FIL, and JP", () => {
    const enKeys = collectKeys(LOCALES.en_us);
    for (const locale of SUPPORTED_LOCALES) {
      assert.deepEqual(
        collectKeys(LOCALES[locale]),
        enKeys,
        `Key mismatch for locale "${locale}"`,
      );
    }
  });
});

describe("normalizeLocaleTag", () => {
  it("maps EN, FIL/TL, and JA/JP tags", () => {
    assert.equal(normalizeLocaleTag("en"), "en_us");
    assert.equal(normalizeLocaleTag("en-US"), "en_us");
    assert.equal(normalizeLocaleTag("en_us"), "en_us");
    assert.equal(normalizeLocaleTag("fil"), "fil_ph");
    assert.equal(normalizeLocaleTag("fil-PH"), "fil_ph");
    assert.equal(normalizeLocaleTag("fil_ph"), "fil_ph");
    assert.equal(normalizeLocaleTag("tl"), "fil_ph");
    assert.equal(normalizeLocaleTag("tl-PH"), "fil_ph");
    assert.equal(normalizeLocaleTag("ja"), "ja_jp");
    assert.equal(normalizeLocaleTag("ja-JP"), "ja_jp");
    assert.equal(normalizeLocaleTag("ja_jp"), "ja_jp");
    assert.equal(normalizeLocaleTag("jp"), "ja_jp");
    assert.equal(normalizeLocaleTag("fr-FR"), null);
    assert.equal(normalizeLocaleTag(""), null);
  });
});

describe("detectBrowserLocale", () => {
  it("picks the first supported language from navigator.languages", () => {
    assert.equal(detectBrowserLocale({ languages: ["ja-JP", "en-US"] }), "ja_jp");
    assert.equal(detectBrowserLocale({ languages: ["fil-PH", "en-US"] }), "fil_ph");
    assert.equal(detectBrowserLocale({ languages: ["tl-PH", "en"] }), "fil_ph");
    assert.equal(detectBrowserLocale({ languages: ["es-ES", "ja"] }), "ja_jp");
  });

  it("falls back to navigator.language and defaults to en_us", () => {
    assert.equal(detectBrowserLocale({ language: "ja" }), "ja_jp");
    assert.equal(detectBrowserLocale({ language: "tl" }), "fil_ph");
    assert.equal(detectBrowserLocale({ language: "de-DE" }), "en_us");
    assert.equal(detectBrowserLocale(null), "en_us");
  });
});

describe("resolveLocale", () => {
  it("prefers ?locale= or ?lang= query param over browser language", () => {
    assert.equal(
      resolveLocale({ search: "?locale=ja_jp", nav: { language: "en-US" } }),
      "ja_jp",
    );
    assert.equal(
      resolveLocale({ search: "?locale=fil_ph", nav: { language: "ja-JP" } }),
      "fil_ph",
    );
    assert.equal(
      resolveLocale({ search: "?lang=jp", nav: { language: "en-US" } }),
      "ja_jp",
    );
    assert.equal(
      resolveLocale({ search: "?locale=unknown", nav: { language: "ja-JP" } }),
      "ja_jp",
    );
  });
});

describe("getTranslation", () => {
  it("interpolates placeholders and falls back to EN for missing keys", () => {
    assert.equal(
      getTranslation("en_us", "contact.toast.serverError", { status: 503 }),
      "Server error (HTTP 503). Please try again later or reach out via the social links below.",
    );
    assert.equal(
      getTranslation("ja_jp", "contact.toast.endpointUnavailable", { status: 404 }),
      "フォームの送信先が利用できません（HTTP 404）。下のSNSリンクからご連絡ください。",
    );
    assert.equal(getTranslation("ja_jp", "nonexistent.key"), "nonexistent.key");
  });
});

describe("applyI18n and experience duration integration", () => {
  it("updates DOM attributes and preserves date-range calculation", () => {
    const elements = {
      titleEl: { textContent: "", getAttribute: () => "nav.links.about" },
      htmlEl: { innerHTML: "", getAttribute: () => "hero.titleHtml" },
      inputEl: {
        attrs: {},
        getAttribute: () => "contact.form.namePlaceholder",
        setAttribute(k, v) {
          this.attrs[k] = v;
        },
      },
      dateEl: {
        textContent: "July 2026 – Present",
        dataset: { dateRange: "July 2026 – Present" },
        getAttribute: () => "experience.items.0.date",
      },
    };

    const doc = {
      documentElement: { lang: "en" },
      title: "",
      querySelectorAll(selector) {
        if (selector === "[data-i18n]") return [elements.titleEl, elements.dateEl];
        if (selector === "[data-i18n-html]") return [elements.htmlEl];
        if (selector === "[data-i18n-placeholder]") return [elements.inputEl];
        if (selector === "#experience .experience-date") return [elements.dateEl];
        return [];
      },
    };

    applyI18n(doc, "ja_jp");
    assert.equal(doc.documentElement.lang, "ja");
    assert.equal(doc.title, LOCALES.ja_jp.meta.title);
    assert.equal(elements.titleEl.textContent, "自己紹介");
    assert.equal(elements.inputEl.attrs.placeholder, "お名前を入力");
    assert.equal(elements.dateEl.textContent, "2026年7月 – 現在");

    applyExperienceDurations(doc, new Date(2026, 10, 15));
    assert.equal(elements.dateEl.textContent, "2026年7月 – 現在 · 5 mos");
  });
});
