import bundledItchProjects from "../../data/itch-projects.json" with { type: "json" };
import { cacheImageElement } from "../core/cache.js";
import { onDomReady } from "../core/dom.js";
import { i18nReady, t } from "../core/i18n.js";
import { resolveGameDetails } from "./project-details.js";
import { openProjectModal } from "./project-modal.js";
import { renderProjectGrid } from "./projects-shared.js";

function resolveAssetPath(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\/+/, "")}`;
}

async function initItchProjects() {
  await i18nReady;
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  const projects = Array.isArray(bundledItchProjects) ? bundledItchProjects : null;

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
        image: resolveAssetPath(project.image),
        imageAlt: project.title || t("projects.gameAlt"),
        onImage: (img) => void cacheImageElement(img),
        cueLabel: t("projects.viewBreakdown"),
        onSelect: (triggerEl) => openProjectModal(details, triggerEl),
      };
    },
  });
}

export const itchProjectsReady = onDomReady(initItchProjects);
