import { bindModalDismiss } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { escapeHtml } from "../core/text.js";

const PDFJS_VERSION = "4.10.38";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let activeModal = null;
let lastTriggerEl = null;
let escapeListenerAttached = false;
let pdfjsPromise = null;

function isMobilePdfFallbackNeeded() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(max-width: 768px), (pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "")
  );
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(/* @vite-ignore */ PDFJS_MODULE_URL).then((mod) => {
      if (mod.GlobalWorkerOptions) {
        mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }
      return mod;
    });
  }
  return pdfjsPromise;
}

async function renderPdfPagesToContainer(container, pdfUrl) {
  container.innerHTML = `<p class="case-study-loading">Loading preview…</p>`;
  try {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    if (!activeModal || !container.isConnected) return;

    const pagesEl = document.createElement("div");
    pagesEl.className = "case-study-pages";
    const targetWidth = Math.max(280, container.clientWidth - 24);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      if (!activeModal || !container.isConnected) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = targetWidth / baseViewport.width;
      const renderViewport = page.getViewport({ scale: cssScale * dpr });

      const canvas = document.createElement("canvas");
      canvas.className = "case-study-page-canvas";
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${Math.floor(baseViewport.width * cssScale)}px`;
      canvas.style.height = `${Math.floor(baseViewport.height * cssScale)}px`;

      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: renderViewport,
      }).promise;

      pagesEl.appendChild(canvas);
    }

    container.innerHTML = "";
    container.appendChild(pagesEl);
  } catch {
    if (!activeModal || !container.isConnected) return;
    const safeUrl = escapeHtml(pdfUrl);
    container.innerHTML = `<iframe class="resume-preview-frame" src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="Case Study PDF"></iframe>`;
  }
}

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

  const safeTitle = escapeHtml(t("education.items.0.caseStudyModalTitle"));
  const safeCloseLabel = escapeHtml(t("contact.form.closeResumePreview"));
  const safeUrl = escapeHtml(pdfUrl);
  const useCanvasViewer = isMobilePdfFallbackNeeded();

  const overlay = document.createElement("div");
  overlay.id = "case-study-modal";
  overlay.className = "resume-modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "case-study-modal-title");

  overlay.innerHTML = `
    <div class="resume-modal">
      <div class="resume-modal-header">
        <div>
          <h2 id="case-study-modal-title" class="resume-modal-title">${safeTitle}</h2>
        </div>
        <div class="resume-modal-controls">
          <button type="button" class="resume-modal-close" aria-label="${safeCloseLabel}">&times;</button>
        </div>
      </div>
      <div class="resume-preview-frame-wrap">
        ${
          useCanvasViewer
            ? ""
            : `<iframe class="resume-preview-frame" src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="${safeTitle}"></iframe>`
        }
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
    if (wrap) void renderPdfPagesToContainer(wrap, pdfUrl);
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
