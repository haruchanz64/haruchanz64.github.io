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

export const PDF_MODAL_CLASSES = {
  overlay:
    "fixed inset-0 z-[2000] bg-black/72 backdrop-blur-[4px] flex items-center justify-center p-4",
  dialog:
    "bg-bg-secondary text-text-primary border border-border rounded-brand w-[min(760px,100%)] h-[min(92dvh,960px)] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
  header:
    "flex items-center justify-between flex-wrap gap-x-4 gap-y-2 px-5 py-[0.9rem] border-b border-border",
  title: "m-0 text-[1.05rem] font-display font-bold",
  controls: "flex items-center gap-3",
  downloadBtn:
    "resume-download-btn inline-flex items-center gap-2 rounded-brand border-none bg-accent px-[1.1rem] py-[0.55rem] font-display text-[0.85rem] font-semibold text-bg-primary no-underline cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent-secondary hover:text-bg-primary",
  closeBtn:
    "resume-modal-close bg-transparent border-none text-text-secondary text-[1.6rem] leading-none cursor-pointer px-2 py-1 rounded-[6px] transition-colors duration-300 ease-in-out hover:text-text-primary hover:bg-white/8",
  frameWrap:
    "resume-preview-frame-wrap flex-1 min-h-0 bg-[#525659] has-[.case-study-pages]:overflow-y-auto has-[.case-study-loading]:overflow-y-auto has-[.case-study-pages]:[-webkit-overflow-scrolling:touch] has-[.case-study-loading]:[-webkit-overflow-scrolling:touch]",
  iframe: "w-full h-full border-none block",
  loading: "case-study-loading text-[#f4f4f6] text-center px-4 py-8 text-[0.9rem]",
  pages: "case-study-pages flex flex-col items-center gap-3 p-3",
  canvas: "block bg-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] rounded-[4px]",
};

/**
 * Build the desktop iframe markup for an inline PDF preview.
 * @param {string} pdfUrl
 * @param {string} title
 */
export function createPdfIframeMarkup(pdfUrl, title) {
  const safeUrl = escapeHtml(pdfUrl);
  const safeTitle = escapeHtml(title);
  return `<iframe class="${PDF_MODAL_CLASSES.iframe}" src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="${safeTitle}"></iframe>`;
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
  container.innerHTML = `<p class="${PDF_MODAL_CLASSES.loading}">Loading preview…</p>`;
  try {
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    if (!isOpen() || !container.isConnected) return;

    const pagesEl = document.createElement("div");
    pagesEl.className = PDF_MODAL_CLASSES.pages;
    const targetWidth = Math.max(280, container.clientWidth - 24);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      if (!isOpen() || !container.isConnected) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = targetWidth / baseViewport.width;
      const renderViewport = page.getViewport({ scale: cssScale * dpr });

      const canvas = document.createElement("canvas");
      canvas.className = PDF_MODAL_CLASSES.canvas;
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
