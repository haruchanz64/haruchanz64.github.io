import { escapeHtml } from "../core/text.js";

const PDFJS_VERSION = "4.10.38";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsPromise = null;

/**
 * Detect mobile/coarse-pointer environments where inline PDF iframes often fail to render.
 */
export function isMobilePdfFallbackNeeded() {
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

/**
 * Build the desktop iframe markup for an inline PDF preview.
 * @param {string} pdfUrl
 * @param {string} title
 */
export function createPdfIframeMarkup(pdfUrl, title) {
  const safeUrl = escapeHtml(pdfUrl);
  const safeTitle = escapeHtml(title);
  return `<iframe class="resume-preview-frame" src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="${safeTitle}"></iframe>`;
}

/**
 * Render all pages of a PDF (static URL or blob: URL) onto crisp canvases inside `container`.
 * Falls back to an iframe if PDF.js fails to load.
 * @param {HTMLElement} container
 * @param {string} pdfUrl
 * @param {{ isOpen?: () => boolean, title?: string }} [options]
 */
export async function renderPdfPagesToContainer(
  container,
  pdfUrl,
  { isOpen = () => true, title = "PDF Preview" } = {},
) {
  container.innerHTML = `<p class="case-study-loading">Loading preview…</p>`;
  try {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    if (!isOpen() || !container.isConnected) return;

    const pagesEl = document.createElement("div");
    pagesEl.className = "case-study-pages";
    const targetWidth = Math.max(280, container.clientWidth - 24);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      if (!isOpen() || !container.isConnected) return;

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
    if (!isOpen() || !container.isConnected) return;
    container.innerHTML = createPdfIframeMarkup(pdfUrl, title);
  }
}
