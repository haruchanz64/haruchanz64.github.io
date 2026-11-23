import { bindModalDismiss } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { escapeHtml } from "../core/text.js";
import {
  createPdfIframeMarkup,
  isMobilePdfFallbackNeeded,
  PDF_MODAL_CLASSES,
  renderPdfPagesToContainer,
} from "./pdf-preview.js";

let activeModal = null;
let lastTriggerEl = null;
let escapeListenerAttached = false;

function closeCaseStudyModal() {
  if (!activeModal) return;
  activeModal.remove();
  activeModal = null;
  document.documentElement?.classList?.remove("modal-open");
  if (lastTriggerEl && typeof lastTriggerEl.focus === "function") {
    lastTriggerEl.focus();
  }
  lastTriggerEl = null;
}

/**
 * Open an in-page PDF preview modal for a case study without a download button.
 * @param {string} pdfUrl
 * @param {HTMLElement | null} [triggerEl]
 */
export function openCaseStudyModal(pdfUrl, triggerEl = null) {
  if (typeof document === "undefined" || !pdfUrl) return;

  if (activeModal) {
    closeCaseStudyModal();
  }

  lastTriggerEl = triggerEl || document.activeElement;

  const title = t("education.items.0.caseStudyModalTitle");
  const safeTitle = escapeHtml(title);
  const safeCloseLabel = escapeHtml(t("contact.form.closeResumePreview"));
  const useCanvasViewer = isMobilePdfFallbackNeeded();

  const overlay = document.createElement("div");
  overlay.id = "case-study-modal";
  overlay.className = PDF_MODAL_CLASSES.overlay;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "case-study-modal-title");

  overlay.innerHTML = `
    <div class="${PDF_MODAL_CLASSES.dialog}">
      <div class="${PDF_MODAL_CLASSES.header}">
        <div>
          <h2 id="case-study-modal-title" class="${PDF_MODAL_CLASSES.title}">${safeTitle}</h2>
        </div>
        <div class="${PDF_MODAL_CLASSES.controls}">
          <button type="button" class="${PDF_MODAL_CLASSES.closeBtn}" aria-label="${safeCloseLabel}">&times;</button>
        </div>
      </div>
      <div class="${PDF_MODAL_CLASSES.frameWrap}">
        ${useCanvasViewer ? "" : createPdfIframeMarkup(pdfUrl, title)}
      </div>
    </div>
  `;

  bindModalDismiss({
    modal: overlay,
    closeButton: overlay.querySelector(".resume-modal-close"),
    isOpen: () => Boolean(activeModal),
    onClose: closeCaseStudyModal,
    attachEscape: !escapeListenerAttached,
  });
  escapeListenerAttached = true;

  document.body.appendChild(overlay);
  document.documentElement?.classList?.add("modal-open");
  activeModal = overlay;

  if (useCanvasViewer) {
    const wrap = overlay.querySelector(".resume-preview-frame-wrap");
    if (wrap) {
      void renderPdfPagesToContainer(wrap, pdfUrl, {
        isOpen: () => Boolean(activeModal),
        title,
      });
    }
  }

  overlay.querySelector(".resume-modal-close")?.focus();
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-preview-case-study]");
    if (!trigger) return;
    event.preventDefault();
    const pdfUrl = trigger.getAttribute("data-case-study-url");
    if (pdfUrl) {
      openCaseStudyModal(pdfUrl, trigger);
    }
  });
}
