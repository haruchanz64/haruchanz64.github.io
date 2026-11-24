import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSET_CACHE_PREFIX,
  cacheAllDocumentAssets,
  cacheAssetUrl,
  cacheImageElement,
  readCache,
  readCachedAssetDataUrl,
  writeCache,
  writeCachedAssetDataUrl,
} from "../src/js/core/cache.js";
import { LOCALES } from "../src/js/core/i18n.js";
import {
  animateThemeSwitch,
  getSavedTheme,
  initThemeToggle,
  saveTheme,
  THEME_STORAGE_KEY,
} from "../src/js/ui/theme.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
  };
}

describe("Skills naming in locales", () => {
  it("uses Skills consistently in nav and section title", () => {
    assert.equal(LOCALES.en_us.skills.title, "Skills");
    assert.equal(LOCALES.en_us.nav.links.skills, "Skills");
  });
});

describe("localStorage cache and asset caching", () => {
  it("persists and reads JSON data in localStorage", () => {
    const storage = createMemoryStorage();
    writeCache("test_key", { hello: "world" }, storage);
    assert.deepEqual(readCache("test_key", 60_000, false, storage), {
      hello: "world",
    });
  });

  it("caches images and devicon SVGs as data URLs in localStorage and CacheStorage", async () => {
    const storage = createMemoryStorage();
    const cachePutCalls = [];
    const mockCaches = {
      async open() {
        return {
          async match() {
            return null;
          },
          async put(url, res) {
            cachePutCalls.push(url);
            return res;
          },
        };
      },
    };

    const svgUrl =
      "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg";
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';

    const mockFetch = async () => ({
      ok: true,
      type: "cors",
      clone() {
        return this;
      },
      async blob() {
        return new Blob([svgContent], { type: "image/svg+xml" });
      },
    });

    const dataUrl = await cacheAssetUrl(svgUrl, {
      storage,
      cachesApi: mockCaches,
      fetchImpl: mockFetch,
    });

    assert.ok(dataUrl.startsWith("data:image/svg+xml;base64,"));
    assert.equal(readCachedAssetDataUrl(svgUrl, storage), dataUrl);
    assert.equal(storage.getItem(`${ASSET_CACHE_PREFIX}${svgUrl}`), dataUrl);
    assert.deepEqual(cachePutCalls, [svgUrl]);
  });

  it("hydrates <img> and <link rel=icon> elements from cached data URLs in localStorage", async () => {
    const storage = createMemoryStorage();
    const deviconUrl =
      "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/dart/dart-original.svg";
    const cachedDataUri = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=";
    writeCachedAssetDataUrl(deviconUrl, cachedDataUri, storage);

    const imgEl = {
      src: deviconUrl,
      dataset: {},
      getAttribute(attr) {
        return attr === "src" ? this.src : null;
      },
    };

    const resolved = await cacheImageElement(imgEl, { storage });
    assert.equal(resolved, cachedDataUri);
    assert.equal(imgEl.src, cachedDataUri);
    assert.equal(imgEl.dataset.originalSrc, deviconUrl);

    const iconHref = "/res/favicon.ico";
    const cachedIconUri = "data:image/x-icon;base64,AAABAAEAEBAQ";
    writeCachedAssetDataUrl(iconHref, cachedIconUri, storage);
    const linkEl = {
      href: iconHref,
      dataset: {},
      getAttribute(attr) {
        return attr === "href" ? this.href : null;
      },
      setAttribute(attr, val) {
        if (attr === "href") this.href = val;
      },
    };

    const doc = {
      querySelectorAll(sel) {
        if (sel === "img[src]") return [imgEl];
        if (sel === 'link[rel*="icon"][href]') return [linkEl];
        return [];
      },
    };

    await cacheAllDocumentAssets(doc, { storage });
    assert.equal(linkEl.href, cachedIconUri);
  });
});

describe("theme persistence and switch animation", () => {
  it("persists theme selection in localStorage", () => {
    const storage = createMemoryStorage();
    assert.equal(getSavedTheme(storage), null);
    saveTheme("light", storage);
    assert.equal(getSavedTheme(storage), "light");
    assert.equal(storage.getItem(THEME_STORAGE_KEY), "light");
  });

  it("applies theme state and triggers simple view transition", () => {
    const classes = new Set();
    let viewTransitionCalled = false;
    const toggleAttrs = new Map();
    const maintenanceToggleAttrs = new Map();

    const toggleBtn = {
      setAttribute(k, v) {
        toggleAttrs.set(k, v);
      },
    };

    const maintenanceToggleBtn = {
      setAttribute(k, v) {
        maintenanceToggleAttrs.set(k, v);
      },
    };

    const root = {
      style: {},
      classList: {
        toggle(c, force) {
          if (force) classes.add(c);
          else classes.delete(c);
        },
        contains(c) {
          return classes.has(c);
        },
      },
    };

    const doc = {
      documentElement: root,
      getElementById(id) {
        return id === "theme-toggle" ? toggleBtn : null;
      },
      querySelectorAll(sel) {
        if (sel === "[data-theme-toggle]") return [toggleBtn, maintenanceToggleBtn];
        return [];
      },
      startViewTransition(cb) {
        viewTransitionCalled = true;
        cb();
        return { ready: Promise.resolve() };
      },
    };

    const win = {
      matchMedia() {
        return { matches: false };
      },
    };

    animateThemeSwitch(false, { doc, win });

    assert.equal(viewTransitionCalled, true);
    assert.equal(classes.has("light-theme"), true);
    assert.equal(root.style.colorScheme, "light");
    assert.equal(toggleAttrs.get("aria-pressed"), "true");
    assert.equal(maintenanceToggleAttrs.get("aria-pressed"), "true");
  });

  it("follows OS preference without persisting until toggled, then ignores OS changes", () => {
    const storage = createMemoryStorage();
    const classes = new Set();
    const clickHandlers = [];
    const mediaChangeHandlers = [];

    const toggleBtn = {
      dataset: {},
      setAttribute() {},
      addEventListener(event, cb) {
        if (event === "click") clickHandlers.push(cb);
      },
    };

    const root = {
      style: {},
      classList: {
        toggle(c, force) {
          if (force) classes.add(c);
          else classes.delete(c);
        },
        contains(c) {
          return classes.has(c);
        },
      },
    };

    const doc = {
      documentElement: root,
      getElementById(id) {
        return id === "theme-toggle" ? toggleBtn : null;
      },
      querySelectorAll(sel) {
        if (sel === "[data-theme-toggle]") return [toggleBtn];
        return [];
      },
    };

    const win = {
      matchMedia(query) {
        if (query === "(prefers-color-scheme: dark)") {
          return {
            matches: true,
            addEventListener(event, cb) {
              if (event === "change") mediaChangeHandlers.push(cb);
            },
          };
        }
        return { matches: false };
      },
    };

    initThemeToggle({ doc, win, storage });

    // Follows initial OS preference (dark) without writing to localStorage.
    assert.equal(classes.has("light-theme"), false);
    assert.equal(root.style.colorScheme, "dark");
    assert.equal(getSavedTheme(storage), null);

    // Follows subsequent OS change (light) while no manual choice is saved.
    mediaChangeHandlers[0]({ matches: false });
    assert.equal(classes.has("light-theme"), true);
    assert.equal(root.style.colorScheme, "light");
    assert.equal(getSavedTheme(storage), null);

    // Manual toggle switches to dark and persists preference.
    clickHandlers[0]();
    assert.equal(classes.has("light-theme"), false);
    assert.equal(root.style.colorScheme, "dark");
    assert.equal(getSavedTheme(storage), "dark");

    // Later OS changes do not override the user's explicit toggle choice.
    mediaChangeHandlers[0]({ matches: false });
    assert.equal(classes.has("light-theme"), false);
    assert.equal(root.style.colorScheme, "dark");
    assert.equal(getSavedTheme(storage), "dark");
  });
});
