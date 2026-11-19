import { onDomReady } from "../core/dom.js";
import { i18nReady, t } from "../core/i18n.js";
import { GITHUB_USERNAME, mapPinnedRepos } from "./github-config.js";
import { loadCachedList, renderProjectGrid } from "./projects-shared.js";

const CACHE_KEY = "haru_github_projects_v2";
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchLiveGithubProjects() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner`,
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return mapPinnedRepos(await res.json());
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

  const projects = await loadCachedList({
    cacheKey: CACHE_KEY,
    ttlMs: CACHE_TTL_MS,
    fetchPrimary: fetchLiveGithubProjects,
    fetchFallback: fetchFallbackGithubProjects,
    label: "GitHub projects",
  });

  if (!projects) {
    grid.innerHTML = `<p class="loading-text">${t("projects.failedToLoad")}</p>`;
    return;
  }

  renderProjectGrid({
    grid,
    items: projects,
    emptyMessage: t("projects.noneFound"),
    mapItem: (repo) => ({
      url: repo.html_url,
      title: repo.name,
      description: repo.description || t("projects.noDescription"),
      tags: [{ className: "project-language", text: repo.language }],
    }),
  });
}

export const githubProjectsReady = onDomReady(initGithubProjects);
