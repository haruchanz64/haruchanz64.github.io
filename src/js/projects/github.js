import bundledGithubProjects from "../../data/github-projects.json" with { type: "json" };
import { writeCache } from "../core/cache.js";
import { onDomReady } from "../core/dom.js";
import { fetchWithRetry } from "../core/http.js";
import { i18nReady, t } from "../core/i18n.js";
import { formatReleaseDate, GITHUB_USERNAME, selectLatestGithubRepos } from "./github-config.js";
import { resolveToolDetails } from "./project-details.js";
import { openProjectModal } from "./project-modal.js";
import { loadCachedList, renderProjectGrid } from "./projects-shared.js";

const CACHE_KEY = "haru_github_projects_v16";
const LATEST_CACHE_KEY = "haru_github_latest_v9";
const CACHE_TTL_MS = 60 * 60 * 1000;
const INITIAL_VISIBLE_TOOLS = 8;

const GITHUB_REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner&sort=created&direction=desc`;
const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
};

let inflightRawRepos = null;

function mapRepoItem(repo) {
  const details = resolveToolDetails(repo);
  return {
    url: repo.html_url,
    title: repo.name,
    category: details.category,
    dateTime: details.releasedAt,
    dateLabel: formatReleaseDate(details.releasedAt),
    description:
      details.cardDescription || repo.description || details.summary || t("projects.noDescription"),
    tags: details.cardTags,
    cueLabel: t("projects.viewBreakdown"),
    onSelect: (triggerEl) => openProjectModal(details, triggerEl),
  };
}

async function fetchRawGithubRepos() {
  if (typeof fetch !== "function") {
    throw new Error("fetch unavailable");
  }
  if (!inflightRawRepos) {
    inflightRawRepos = fetchWithRetry(
      GITHUB_REPOS_URL,
      { headers: GITHUB_API_HEADERS },
      { attempts: 2, baseDelayMs: 400, timeoutMs: 8000 },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        return res.json();
      })
      .finally(() => {
        inflightRawRepos = null;
      });
  }
  return inflightRawRepos;
}

async function fetchLiveGithubProjects() {
  const rawRepos = await fetchRawGithubRepos();
  const allProjects = selectLatestGithubRepos(rawRepos, 100);
  if (allProjects.length > 0) {
    writeCache(LATEST_CACHE_KEY, allProjects.slice(0, 3));
  }
  return allProjects;
}

async function fetchFallbackGithubProjects() {
  return Array.isArray(bundledGithubProjects) ? bundledGithubProjects : [];
}

/**
 * Fetch the latest public GitHub repositories (with 1-hour caching and JSON fallback)
 * for dynamic resume project selection.
 * @param {number} [count=3]
 * @returns {Promise<Array<{ name: string, html_url: string, description: string, language: string }> | null>}
 */
export async function fetchLatestGithubProjects(count = 3) {
  if (typeof fetch !== "function") return null;
  return loadCachedList({
    cacheKey: LATEST_CACHE_KEY,
    ttlMs: CACHE_TTL_MS,
    fetchPrimary: async () => selectLatestGithubRepos(await fetchRawGithubRepos(), count),
    fetchFallback: async () => selectLatestGithubRepos(await fetchFallbackGithubProjects(), count),
    label: "Latest GitHub projects",
  });
}

async function initGithubProjects() {
  await i18nReady;
  const grid = document.getElementById("tools-grid");
  if (!grid) return;

  const toggleWrap = document.getElementById("tools-toggle-wrap");
  const toggleBtn = document.getElementById("tools-toggle");

  const projects = await loadCachedList({
    cacheKey: CACHE_KEY,
    ttlMs: CACHE_TTL_MS,
    fetchPrimary: fetchLiveGithubProjects,
    fetchFallback: fetchFallbackGithubProjects,
    label: "GitHub projects",
  });

  if (!projects) {
    const failedMessage = t("projects.failedToLoad");
    grid.innerHTML = `<p class="col-span-full text-text-secondary">${failedMessage}</p>`;
    if (toggleWrap) toggleWrap.hidden = true;
    return;
  }

  const hasOverflow = Boolean(toggleWrap && toggleBtn && projects.length > INITIAL_VISIBLE_TOOLS);
  const initialItems = hasOverflow ? projects.slice(0, INITIAL_VISIBLE_TOOLS) : projects;

  renderProjectGrid({
    grid,
    items: initialItems,
    emptyMessage: t("projects.noneFound"),
    mapItem: mapRepoItem,
  });

  if (!hasOverflow) {
    if (toggleWrap) toggleWrap.hidden = true;
    return;
  }

  const extraItems = projects.slice(INITIAL_VISIBLE_TOOLS);
  let expanded = false;
  let extraCards = null;

  const syncToggle = () => {
    toggleBtn.setAttribute("aria-expanded", String(expanded));
    toggleBtn.textContent = expanded
      ? t("projects.showFewerTools")
      : t("projects.showMoreTools", { count: extraItems.length });
  };

  syncToggle();
  toggleWrap.hidden = false;

  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    if (expanded) {
      if (!extraCards) {
        extraCards = renderProjectGrid({
          grid,
          items: extraItems,
          emptyMessage: "",
          append: true,
          mapItem: mapRepoItem,
        });
      } else {
        for (const card of extraCards) {
          grid.appendChild(card);
          if (window.observeReveal) window.observeReveal(card);
        }
      }
    } else if (extraCards) {
      for (const card of extraCards) {
        card.remove();
      }
    }
    syncToggle();
  });
}

export const githubProjectsReady = onDomReady(initGithubProjects);
