import { bindModalDismiss } from "../core/dom.js";
import { getCurrentLocale, t } from "../core/i18n.js";
import { escapeHtml } from "../core/text.js";
import { openCaseStudyModal } from "../ui/case-study.js";
import { formatReleaseDate } from "./github-config.js";

let activeModal = null;
let lastTriggerEl = null;
let escapeListenerAttached = false;

export function closeProjectModal({ restoreFocus = true } = {}) {
  if (!activeModal) return;
  activeModal.remove();
  activeModal = null;
  document.documentElement?.classList?.remove("modal-open");
  if (restoreFocus && lastTriggerEl && typeof lastTriggerEl.focus === "function") {
    lastTriggerEl.focus();
  }
  lastTriggerEl = null;
}

/**
 * Open an in-page project breakdown modal for a Game Project or Unity Tool.
 * @param {{
 *   kind: "game" | "tool",
 *   title: string,
 *   url: string,
 *   image?: string,
 *   role?: string,
 *   engine?: string,
 *   team?: string,
 *   focus?: string,
 *   summary?: string,
 *   highlights?: string[],
 *   stack?: string[],
 *   caseStudyUrl?: string,
 * }} details
 * @param {HTMLElement | null} [triggerEl]
 */
export function openProjectModal(details, triggerEl = null) {
  if (typeof document === "undefined" || !details) return;

  if (activeModal) {
    closeProjectModal({ restoreFocus: false });
  }

  lastTriggerEl = triggerEl || document.activeElement;

  const isGame = details.kind === "game";
  const categoryLabel = isGame ? t("projects.gameProjects") : t("projects.systemsTools");
  const breakdownHeading = isGame
    ? t("projects.modal.designBreakdown")
    : t("projects.modal.technicalHighlights");
  const primaryCtaLabel = isGame
    ? t("projects.modal.playOnItch")
    : t("projects.modal.viewOnGithub");
  const closeLabel = t("projects.modal.close");

  const formattedRelease = details.releasedAt
    ? formatReleaseDate(details.releasedAt, getCurrentLocale())
    : "";

  const metaRows = [
    details.role ? { label: t("projects.modal.role"), value: details.role } : null,
    details.engine ? { label: t("projects.modal.engine"), value: details.engine } : null,
    details.team ? { label: t("projects.modal.scope"), value: details.team } : null,
    formattedRelease ? { label: t("projects.modal.released"), value: formattedRelease } : null,
  ].filter(Boolean);

  const metaColsClass = metaRows.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  const metaHtml = metaRows.length
    ? `<dl class="grid grid-cols-1 ${metaColsClass} gap-3 p-3.5 rounded-brand bg-bg-tertiary border border-border/70 mb-5">
        ${metaRows
          .map(
            (row) => `<div>
              <dt class="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-text-muted mb-1">${escapeHtml(row.label)}</dt>
              <dd class="m-0 text-[0.88rem] font-medium text-text-primary leading-[1.4]">${escapeHtml(row.value)}</dd>
            </div>`,
          )
          .join("")}
      </dl>`
    : "";

  const imageHtml = details.image
    ? `<img src="${escapeHtml(details.image)}" alt="${escapeHtml(details.title)}" class="w-full aspect-video object-cover rounded-[8px] mb-5 border border-border/60" />`
    : "";

  const highlightsHtml =
    Array.isArray(details.highlights) && details.highlights.length > 0
      ? `<div class="mb-5">
          <h4 class="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-accent font-semibold mb-2.5">${escapeHtml(breakdownHeading)}</h4>
          <ul class="list-disc pl-5 m-0 flex flex-col gap-2 text-[0.94rem] leading-[1.65] text-text-secondary [&_li::marker]:text-accent">
            ${details.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const stackHtml =
    Array.isArray(details.stack) && details.stack.length > 0
      ? `<div class="mb-1">
          <h4 class="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-text-muted font-semibold mb-2">${escapeHtml(t("projects.modal.techStack"))}</h4>
          <div class="flex flex-wrap gap-2">
            ${details.stack
              .map(
                (item) =>
                  `<span class="font-mono bg-bg-tertiary border border-border/60 text-accent px-2.5 py-1 rounded-[5px] font-medium text-[0.78rem]">${escapeHtml(item)}</span>`,
              )
              .join("")}
          </div>
        </div>`
      : "";

  const caseStudyBtnHtml = details.caseStudyUrl
    ? `<button type="button" class="project-modal-case-study inline-flex items-center justify-center gap-2 rounded-brand bg-transparent text-accent border border-accent px-4 py-2.5 font-display font-semibold text-[0.88rem] cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent hover:text-bg-primary">${escapeHtml(t("education.items.0.caseStudy"))}</button>`
    : "";

  const overlay = document.createElement("div");
  overlay.id = "project-detail-modal";
  overlay.className =
    "fixed inset-0 z-[2000] bg-black/72 backdrop-blur-[4px] flex items-center justify-center p-4";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "project-modal-title");

  overlay.innerHTML = `
    <div class="bg-card-bg text-text-primary border border-border rounded-brand w-[min(720px,100%)] max-h-[calc(100dvh-2rem)] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
      <div class="flex items-start justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
        <div class="min-w-0">
          <p class="m-0 mb-1 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-accent">${escapeHtml(categoryLabel)}${details.focus ? ` · ${escapeHtml(details.focus)}` : ""}</p>
          <h3 id="project-modal-title" class="m-0 text-[1.2rem] font-display font-bold text-text-primary leading-[1.25]">${escapeHtml(details.title)}</h3>
        </div>
        <button
          type="button"
          class="project-modal-close bg-transparent border-none text-text-secondary text-[1.6rem] leading-none cursor-pointer px-2 py-1 rounded-[6px] transition-[color,background-color] duration-300 ease-in-out hover:text-text-primary hover:bg-text-primary/10 focus-visible:text-text-primary focus-visible:bg-text-primary/10 shrink-0"
          aria-label="${escapeHtml(closeLabel)}"
        >&times;</button>
      </div>
      <div class="px-5 py-5 text-left overflow-y-auto overscroll-contain">
        ${imageHtml}
        ${metaHtml}
        ${details.summary ? `<p class="mt-0 mb-5 text-[0.98rem] leading-[1.7] text-text-secondary">${escapeHtml(details.summary)}</p>` : ""}
        ${highlightsHtml}
        ${stackHtml}
      </div>
      <div class="flex flex-wrap items-center justify-end gap-3 px-5 py-3.5 border-t border-border bg-bg-tertiary/50 shrink-0">
        ${caseStudyBtnHtml}
        ${
          details.url
            ? `<a href="${escapeHtml(details.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 rounded-brand bg-accent text-bg-primary no-underline font-display font-semibold text-[0.88rem] px-4 py-2.5 transition-all duration-300 ease-in-out hover:bg-accent-secondary hover:text-bg-primary">${escapeHtml(primaryCtaLabel)} <span aria-hidden="true">&#8599;</span></a>`
            : ""
        }
      </div>
    </div>
  `;

  const closeBtn = overlay.querySelector(".project-modal-close");
  const caseStudyBtn = overlay.querySelector(".project-modal-case-study");
  if (caseStudyBtn && details.caseStudyUrl) {
    caseStudyBtn.addEventListener("click", () => {
      const originTrigger = lastTriggerEl;
      closeProjectModal({ restoreFocus: false });
      openCaseStudyModal(details.caseStudyUrl, originTrigger);
    });
  }

  bindModalDismiss({
    modal: overlay,
    closeButton: closeBtn,
    isOpen: () => Boolean(activeModal),
    onClose: () => closeProjectModal(),
    attachEscape: !escapeListenerAttached,
  });
  escapeListenerAttached = true;

  document.body.appendChild(overlay);
  document.documentElement?.classList?.add("modal-open");
  activeModal = overlay;

  closeBtn?.focus();
}
