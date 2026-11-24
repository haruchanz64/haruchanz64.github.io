import { onDomReady } from "../core/dom.js";
import { i18nReady, t } from "../core/i18n.js";
import { GITHUB_USERNAME, mapPinnedRepos } from "./github-config.js";
import { resolveToolDetails } from "./project-details.js";
import { openProjectModal } from "./project-modal.js";
import { loadCachedList, renderProjectGrid } from "./projects-shared.js";

const CACHE_KEY = "haru_github_projects_v8";
const CACHE_TTL_MS = 60 * 60 * 1000;
const INITIAL_VISIBLE_TOOLS = 6;

function mapRepoItem(repo) {
  const details = resolveToolDetails(repo);
  return {
    url: repo.html_url,
    title: repo.name,
    eyebrow: details.focus,
    description: repo.description || details.summary || t("projects.noDescription"),
    cueLabel: t("projects.viewBreakdown"),
    onSelect: (triggerEl) => openProjectModal(details, triggerEl),
  };
}

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
    grid.innerHTML = `<p class="text-text-secondary">${t("projects.failedToLoad")}</p>`;
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
