import { readCache, writeCache } from "./cache.js";
import { i18nReady, t } from "./i18n.js";

const CACHE_KEY = "haru_itch_projects_v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

function createTagSpan(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function renderItchProjects(grid, projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    grid.innerHTML = `<p class="loading-text">${t("projects.noneGamesFound")}</p>`;
    return;
  }

  grid.innerHTML = "";

  projects.forEach((project) => {
    const card = document.createElement("a");
    card.href = project.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = "project-card uniform";

    if (project.image) {
      const img = document.createElement("img");
      img.src = project.image;
      img.alt = project.title || t("projects.gameAlt");
      img.className = "project-thumb";
      img.loading = "lazy";
      card.appendChild(img);
    }

    const info = document.createElement("div");
    info.className = "project-info";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = project.title || t("projects.untitled");
    info.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "project-description";
    desc.textContent = project.description || t("projects.noDescription");
    info.appendChild(desc);

    const meta = document.createElement("div");
    meta.className = "project-meta";

    (project.tags || []).forEach((tag) => {
      meta.appendChild(createTagSpan("role-tag", tag));
    });
    (project.platforms || []).forEach((platform) => {
      meta.appendChild(createTagSpan("project-language", platform));
    });

    info.appendChild(meta);
    card.appendChild(info);
    grid.appendChild(card);
    if (window.observeReveal) window.observeReveal(card);
  });
}

async function initItchProjects() {
  await i18nReady;
  const grid = document.getElementById("games-grid");
  if (!grid) return;

  const cached = readCache(CACHE_KEY, CACHE_TTL_MS);
  if (Array.isArray(cached) && cached.length > 0) {
    renderItchProjects(grid, cached);
    return;
  }

  try {
    const res = await fetch("/data/itch-projects.json");
    if (!res.ok) throw new Error(`Failed to load itch projects (${res.status})`);
    const projects = await res.json();
    writeCache(CACHE_KEY, projects);
    renderItchProjects(grid, projects);
  } catch (err) {
    const stale = readCache(CACHE_KEY, CACHE_TTL_MS, true);
    if (Array.isArray(stale) && stale.length > 0) {
      renderItchProjects(grid, stale);
      return;
    }
    console.error("Failed to load itch.io projects:", err);
    grid.innerHTML = `<p class="loading-text">${t("projects.failedToLoad")}</p>`;
  }
}

export const itchProjectsReady =
  document.readyState === "loading"
    ? new Promise((resolve) => {
        document.addEventListener(
          "DOMContentLoaded",
          () => resolve(initItchProjects()),
          { once: true },
        );
      })
    : initItchProjects();
