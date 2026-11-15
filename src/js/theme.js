const THEME_STORAGE_KEY = "theme";

window.initThemeToggle = function () {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  const root = document.documentElement;
  const toggleBtn = document.getElementById("theme-toggle");

  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (e.g. private browsing)
    }
  }

  function applyTheme(isDark) {
    root.classList.toggle("light-theme", !isDark);
    document.querySelectorAll(".github-card").forEach((card) => {
      card.src = isDark
        ? card.src.replace("theme=light", "theme=dark")
        : card.src.replace("theme=dark", "theme=light");
    });

    if (toggleBtn) {
      const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";
      toggleBtn.setAttribute("aria-label", nextLabel);
      toggleBtn.setAttribute("title", nextLabel);
      toggleBtn.setAttribute("aria-pressed", String(!isDark));
    }
  }

  const saved = getSavedTheme();
  let isDark = saved ? saved === "dark" : prefersDark.matches;
  applyTheme(isDark);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      isDark = !isDark;
      saveTheme(isDark ? "dark" : "light");
      applyTheme(isDark);
    });
  }

  prefersDark.addEventListener("change", (e) => {
    if (!getSavedTheme()) {
      isDark = e.matches;
      applyTheme(isDark);
    }
  });
};

document.addEventListener("DOMContentLoaded", window.initThemeToggle);
