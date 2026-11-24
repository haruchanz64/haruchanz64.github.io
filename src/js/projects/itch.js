import { cacheImageElement } from "../core/cache.js";
import { onDomReady } from "../core/dom.js";
import { i18nReady, t } from "../core/i18n.js";
import { resolveGameDetails } from "./project-details.js";
import { openProjectModal } from "./project-modal.js";
import { loadCachedList, renderProjectGrid } from "./projects-shared.js";

const CACHE_KEY = "haru_itch_projects_v3";
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchItchProjects() {
  const res = await fetch("/data/itch-projects.json");
  if (!res.ok) throw new Error(`Failed to load itch projects (${res.status})`);
  return res.json();
}

async function initItchProjects() {
  await i18nReady;
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  const projects = await loadCachedList({
    cacheKey: CACHE_KEY,
    ttlMs: CACHE_TTL_MS,
    fetchPrimary: fetchItchProjects,
    label: "itch.io projects",
  });

  if (!projects) {
    const failedMessage = t("projects.failedToLoad");
    grid.innerHTML = `<p class="col-span-full text-text-secondary">${failedMessage}</p>`;
    return;
  }

  renderProjectGrid({
    grid,
    items: projects,
    emptyMessage: t("projects.noneGamesFound"),
    mapItem: (project) => {
      const details = resolveGameDetails(project);
      return {
        url: project.url,
        title: project.title || t("projects.untitled"),
        description: project.description || details.summary || t("projects.noDescription"),
        image: project.image,
        imageAlt: project.title || t("projects.gameAlt"),
        onImage: (img) => void cacheImageElement(img),
        cueLabel: t("projects.viewBreakdown"),
        onSelect: (triggerEl) => openProjectModal(details, triggerEl),
      };
    },
  });
}

export const itchProjectsReady = onDomReady(initItchProjects);
