import { readCache, writeCache } from "./cache.js";
import { i18nReady, t } from "./i18n.js";

const GITHUB_USERNAME = "haruchanz64";
const PINNED_REPOS = [
  "UnityEventToolkit",
  "DebugCommandSystem",
  "ScriptableBatchTool",
  "SaveEncryptionToolkit",
];
const CACHE_KEY = "haru_github_projects_v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

function renderGithubProjects(grid, repos) {
  if (!Array.isArray(repos) || repos.length === 0) {
    grid.innerHTML = `<p class="loading-text">${t("projects.noneFound")}</p>`;
    return;
  }

  grid.innerHTML = "";

  repos.forEach((repo) => {
    const card = document.createElement("a");
    card.href = repo.html_url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = "project-card uniform";

    const info = document.createElement("div");
    info.className = "project-info";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = repo.name;
    info.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "project-description";
    desc.textContent = repo.description || t("projects.noDescription");
    info.appendChild(desc);

    const meta = document.createElement("div");
    meta.className = "project-meta";
    const lang = document.createElement("span");
    lang.className = "project-language";
    lang.textContent = repo.language || "N/A";
    meta.appendChild(lang);
    info.appendChild(meta);

    card.appendChild(info);
    grid.appendChild(card);
    if (window.observeReveal) window.observeReveal(card);
  });
}

async function fetchLiveGithubProjects() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner`,
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const repos = await res.json();

  return PINNED_REPOS.map((name) => {
    const repo = repos.find((r) => r.name === name);
    if (!repo) return null;
    return {
      name: repo.name,
      html_url: repo.html_url,
      description: repo.description || "",
      language: repo.language || "N/A",
    };
  }).filter(Boolean);
}

async function fetchFallbackGithubProjects() {
  const res = await fetch("/data/github-projects.json");
  if (!res.ok) throw new Error(`Fallback GitHub JSON ${res.status}`);
  return res.json();
}

async function initGithubProjects() {
  await i18nReady;
  const grid = document.getElementById("tools-grid");
  if (!grid) return;

  const cached = readCache(CACHE_KEY, CACHE_TTL_MS);
  if (Array.isArray(cached) && cached.length > 0) {
    renderGithubProjects(grid, cached);
    return;
  }

  try {
    const projects = await fetchLiveGithubProjects();
    writeCache(CACHE_KEY, projects);
    renderGithubProjects(grid, projects);
  } catch (err) {
    console.warn("GitHub API unavailable, using fallback:", err.message);
    const stale = readCache(CACHE_KEY, CACHE_TTL_MS, true);
    if (Array.isArray(stale) && stale.length > 0) {
      renderGithubProjects(grid, stale);
      return;
    }

    try {
      const fallback = await fetchFallbackGithubProjects();
      renderGithubProjects(grid, fallback);
    } catch (fallbackErr) {
      console.error("Failed to load GitHub projects:", fallbackErr);
      grid.innerHTML = `<p class="loading-text">${t("projects.failedToLoad")}</p>`;
    }
  }
}

export const githubProjectsReady =
  document.readyState === "loading"
    ? new Promise((resolve) => {
        document.addEventListener(
          "DOMContentLoaded",
          () => resolve(initGithubProjects()),
          { once: true },
        );
      })
    : initGithubProjects();
