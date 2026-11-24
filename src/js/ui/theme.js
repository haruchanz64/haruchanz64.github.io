import { readStorageItem, writeStorageItem } from "../core/cache.js";
import { onDomReady } from "../core/dom.js";

export const THEME_STORAGE_KEY = "theme";
export const THEME_TRANSITION_MS = 200;

export function getSavedTheme(storage = typeof localStorage !== "undefined" ? localStorage : null) {
  const val = readStorageItem(THEME_STORAGE_KEY, storage);
  return val === "dark" || val === "light" ? val : null;
}

export function saveTheme(
  theme,
  storage = typeof localStorage !== "undefined" ? localStorage : null,
) {
  writeStorageItem(THEME_STORAGE_KEY, theme, storage);
}

function getThemeToggleButtons(doc) {
  if (!doc) return [];
  const buttons = new Set();
  const primary = doc.getElementById?.("theme-toggle");
  if (primary) buttons.add(primary);
  doc.querySelectorAll?.("[data-theme-toggle]")?.forEach((btn) => {
    buttons.add(btn);
  });
  return [...buttons];
}

export function applyThemeState(isDark, doc = typeof document !== "undefined" ? document : null) {
  if (!doc) return;
  const root = doc.documentElement;

  root?.classList?.toggle("light-theme", !isDark);
  if (root?.style) {
    root.style.colorScheme = isDark ? "dark" : "light";
  }

  doc.querySelectorAll?.(".github-card").forEach((card) => {
    card.src = isDark
      ? card.src.replace("theme=light", "theme=dark")
      : card.src.replace("theme=dark", "theme=light");
  });

  const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
  for (const toggleBtn of getThemeToggleButtons(doc)) {
    toggleBtn.setAttribute("aria-label", nextLabel);
    toggleBtn.setAttribute("title", nextLabel);
    toggleBtn.setAttribute("aria-pressed", String(!isDark));
  }
}

export function animateThemeSwitch(
  isDark,
  {
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
  } = {},
) {
  if (!doc) return;

  const prefersReducedMotion =
    win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  if (!prefersReducedMotion && typeof doc.startViewTransition === "function") {
    try {
      doc.startViewTransition(() => {
        applyThemeState(isDark, doc);
      });
      return;
    } catch {
      // Fall back to standard CSS transition below.
    }
  }

  applyThemeState(isDark, doc);
}

export function initThemeToggle({
  doc = typeof document !== "undefined" ? document : null,
  win = typeof window !== "undefined" ? window : null,
  storage = typeof localStorage !== "undefined" ? localStorage : null,
} = {}) {
  if (!win || !doc) return;

  const prefersDark = win.matchMedia("(prefers-color-scheme: dark)");

  const saved = getSavedTheme(storage);
  let isDark = saved ? saved === "dark" : prefersDark.matches;
  applyThemeState(isDark, doc);

  for (const toggleBtn of getThemeToggleButtons(doc)) {
    if (!toggleBtn.dataset.themeBound) {
      toggleBtn.dataset.themeBound = "true";
      toggleBtn.addEventListener("click", () => {
        isDark = !isDark;
        saveTheme(isDark ? "dark" : "light", storage);
        animateThemeSwitch(isDark, { doc, win });
      });
    }
  }

  prefersDark.addEventListener("change", (e) => {
    if (getSavedTheme(storage)) return;
    isDark = e.matches;
    animateThemeSwitch(isDark, { doc, win });
  });
}

if (typeof window !== "undefined") {
  window.initThemeToggle = initThemeToggle;
  void onDomReady(initThemeToggle);
}
