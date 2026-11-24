import { t } from "../core/i18n.js";
import { escapeHtml } from "../core/text.js";

const PDFJS_VERSION = "4.10.38";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export const PDF_ZOOM_MIN = 0.5;
export const PDF_ZOOM_MAX = 2.5;
export const PDF_ZOOM_STEP = 0.25;
export const PDF_ZOOM_DEFAULT = 1;

const MAX_CANVAS_DIMENSION = 4096;
const ZOOM_RENDER_DEBOUNCE_MS = 140;

let pdfjsPromise = null;

/**
 * Clamp a zoom factor to the supported `[PDF_ZOOM_MIN, PDF_ZOOM_MAX]` range.
 * @param {number} value
 * @returns {number}
 */
export function clampZoom(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return PDF_ZOOM_DEFAULT;
  const clamped = Math.min(PDF_ZOOM_MAX, Math.max(PDF_ZOOM_MIN, num));
  return Math.round(clamped * 100) / 100;
}

/**
 * Format a zoom factor (e.g. 1.25) as a readable percentage string ("125%").
 * @param {number} zoom
 * @returns {string}
 */
export function formatZoomPercent(zoom) {
  return `${Math.round(clampZoom(zoom) * 100)}%`;
}

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
    "pdf-modal-overlay fixed inset-0 z-[2000] bg-black/72 backdrop-blur-[4px] flex items-center justify-center p-3 desktop:p-4",
  dialog:
    "pdf-modal-dialog bg-bg-secondary text-text-primary border border-border rounded-brand w-[min(860px,100%)] h-[min(92dvh,980px)] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
  header:
    "flex items-center justify-between flex-wrap gap-x-4 gap-y-2 px-4 desktop:px-5 py-[0.8rem] border-b border-border shrink-0",
  title: "m-0 text-[1rem] desktop:text-[1.05rem] font-display font-bold",
  controls: "flex items-center gap-2.5",
  toolbar:
    "pdf-viewer-toolbar flex items-center justify-between flex-wrap gap-x-3 gap-y-1.5 px-3 desktop:px-5 py-2 bg-bg-tertiary border-b border-border shrink-0",
  toolbarGroup: "flex items-center gap-1.5",
  toolBtn:
    "inline-flex items-center justify-center gap-1.5 min-h-[34px] min-w-[34px] px-2 py-1 rounded-[6px] border border-border bg-bg-secondary/60 text-text-primary font-mono text-[0.75rem] leading-none cursor-pointer transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-text-primary no-underline",
  toolReadout:
    "font-mono text-[0.75rem] tabular-nums text-text-secondary px-1.5 select-none whitespace-nowrap",
  downloadBtn:
    "resume-download-btn inline-flex items-center gap-2 rounded-brand border-none bg-accent px-[1.05rem] py-[0.5rem] font-display text-[0.85rem] font-semibold text-bg-primary no-underline cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent-secondary hover:text-bg-primary focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  closeBtn:
    "resume-modal-close bg-transparent border-none text-text-secondary text-[1.6rem] leading-none cursor-pointer px-2 py-1 rounded-[6px] transition-colors duration-300 ease-in-out hover:text-text-primary hover:bg-text-primary/10 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  frameWrap:
    "resume-preview-frame-wrap flex-1 min-h-0 bg-[#525659] overflow-auto [-webkit-overflow-scrolling:touch]",
  iframe: "w-full h-full border-none block",
  loading: "case-study-loading text-[#f4f4f6] text-center px-4 py-8 text-[0.9rem]",
  pages: "case-study-pages flex flex-col items-center gap-4 p-4 w-max min-w-full",
  canvas: "block bg-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] rounded-[4px] mx-auto",
};

const ICON_PREV =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
const ICON_NEXT =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';
const ICON_ZOOM_OUT =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
const ICON_ZOOM_IN =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
const ICON_PRINT =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
const ICON_OPEN_TAB =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
const ICON_FULLSCREEN_ENTER =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
const ICON_FULLSCREEN_EXIT =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

/**
 * Build the accessible toolbar markup for the PDF viewer (page nav, zoom, fit, fullscreen, optional print/open).
 * @param {{ pdfUrl: string, allowPrint?: boolean, allowOpenInTab?: boolean }} options
 * @returns {string}
 */
export function createPdfToolbarMarkup({
  pdfUrl,
  allowPrint = false,
  allowOpenInTab = false,
} = {}) {
  const safeUrl = escapeHtml(pdfUrl || "");
  const toolbarLabel = escapeHtml(t("pdfViewer.toolbarLabel"));
  const prevLabel = escapeHtml(t("pdfViewer.prevPage"));
  const nextLabel = escapeHtml(t("pdfViewer.nextPage"));
  const zoomOutLabel = escapeHtml(t("pdfViewer.zoomOut"));
  const zoomInLabel = escapeHtml(t("pdfViewer.zoomIn"));
  const resetZoomLabel = escapeHtml(t("pdfViewer.resetZoom"));
  const fitLabel = escapeHtml(t("pdfViewer.fitWidth"));
  const fullscreenLabel = escapeHtml(t("pdfViewer.fullscreen"));
  const openTabLabel = escapeHtml(t("pdfViewer.openNewTab"));
  const printLabel = escapeHtml(t("pdfViewer.print"));

  const printBtn = allowPrint
    ? `<button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="print" aria-label="${printLabel}" title="${printLabel}">${ICON_PRINT}</button>`
    : "";
  const openTabLink =
    allowOpenInTab && safeUrl
      ? `<a class="${PDF_MODAL_CLASSES.toolBtn}" href="${safeUrl}" target="_blank" rel="noopener noreferrer" data-pdf-action="open-tab" aria-label="${openTabLabel}" title="${openTabLabel}">${ICON_OPEN_TAB}</a>`
      : "";

  return `
    <div class="${PDF_MODAL_CLASSES.toolbar}" role="toolbar" aria-label="${toolbarLabel}">
      <div class="${PDF_MODAL_CLASSES.toolbarGroup}">
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="prev-page" aria-label="${prevLabel}" title="${prevLabel}" disabled>${ICON_PREV}</button>
        <span class="${PDF_MODAL_CLASSES.toolReadout}" data-pdf-page-indicator aria-live="polite">1 / 1</span>
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="next-page" aria-label="${nextLabel}" title="${nextLabel}" disabled>${ICON_NEXT}</button>
      </div>
      <div class="${PDF_MODAL_CLASSES.toolbarGroup}">
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="zoom-out" aria-label="${zoomOutLabel}" title="${zoomOutLabel}">${ICON_ZOOM_OUT}</button>
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="zoom-reset" data-pdf-zoom-value aria-label="${resetZoomLabel}" title="${resetZoomLabel}">${formatZoomPercent(PDF_ZOOM_DEFAULT)}</button>
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="zoom-in" aria-label="${zoomInLabel}" title="${zoomInLabel}">${ICON_ZOOM_IN}</button>
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="fit-width" aria-label="${resetZoomLabel}" title="${resetZoomLabel}">${fitLabel}</button>
      </div>
      <div class="${PDF_MODAL_CLASSES.toolbarGroup}">
        ${printBtn}
        ${openTabLink}
        <button type="button" class="${PDF_MODAL_CLASSES.toolBtn}" data-pdf-action="fullscreen" aria-label="${fullscreenLabel}" title="${fullscreenLabel}" aria-pressed="false">${ICON_FULLSCREEN_ENTER}</button>
      </div>
    </div>
  `;
}

/**
 * Build the fallback iframe markup for inline PDF preview when PDF.js cannot load.
 * Keeps browser controls enabled so users still retain zoom and page navigation.
 * @param {string} pdfUrl
 * @param {string} title
 */
export function createPdfIframeMarkup(pdfUrl, title) {
  const safeUrl = escapeHtml(pdfUrl);
  const safeTitle = escapeHtml(title);
  return `<iframe class="${PDF_MODAL_CLASSES.iframe}" src="${safeUrl}#toolbar=1&navpanes=0&view=FitH" title="${safeTitle}"></iframe>`;
}

/**
 * Render all pages of a PDF onto crisp canvases inside `container` (simple standalone helper).
 * @param {HTMLElement} container
 * @param {string} pdfUrl
 * @param {{ isOpen?: () => boolean, title?: string }} [options]
 */
export async function renderPdfPagesToContainer(
  container,
  pdfUrl,
  { isOpen = () => true, title = "PDF Preview" } = {},
) {
  const cleanup = mountPdfViewer({ container, pdfUrl, title, isOpen });
  return cleanup;
}

/**
 * Mount an interactive PDF.js viewer with zoom, fit-width, page navigation, print, and fullscreen controls.
 * Falls back cleanly to a native PDF iframe if PDF.js is unavailable.
 * @param {{
 *   overlay?: HTMLElement | null,
 *   dialog?: HTMLElement | null,
 *   container: HTMLElement | null,
 *   toolbar?: HTMLElement | null,
 *   pdfUrl: string,
 *   title?: string,
 *   isOpen?: () => boolean,
 * }} options
 * @returns {() => void} Cleanup function to invoke when closing the modal.
 */
export function mountPdfViewer({
  overlay = null,
  dialog = null,
  container = null,
  toolbar = null,
  pdfUrl,
  title = "PDF Preview",
  isOpen = () => true,
} = {}) {
  if (!container || !pdfUrl) {
    return () => {};
  }

  let zoom = PDF_ZOOM_DEFAULT;
  let currentPage = 1;
  let totalPages = 0;
  let pdfDoc = null;
  let pageEntries = [];
  let renderToken = 0;
  let zoomRenderTimer = null;
  let resizeTimer = null;
  let cssFullscreen = false;
  let printFrame = null;
  let disposed = false;

  const prevBtn = toolbar?.querySelector?.('[data-pdf-action="prev-page"]') || null;
  const nextBtn = toolbar?.querySelector?.('[data-pdf-action="next-page"]') || null;
  const pageIndicator = toolbar?.querySelector?.("[data-pdf-page-indicator]") || null;
  const zoomOutBtn = toolbar?.querySelector?.('[data-pdf-action="zoom-out"]') || null;
  const zoomInBtn = toolbar?.querySelector?.('[data-pdf-action="zoom-in"]') || null;
  const zoomValueBtn = toolbar?.querySelector?.("[data-pdf-zoom-value]") || null;
  const fitBtn = toolbar?.querySelector?.('[data-pdf-action="fit-width"]') || null;
  const fullscreenBtn = toolbar?.querySelector?.('[data-pdf-action="fullscreen"]') || null;

  const isActive = () => !disposed && isOpen() && container.isConnected !== false;

  const isNativeFullscreen = () =>
    Boolean(dialog && typeof document !== "undefined" && document.fullscreenElement === dialog);

  const isFullscreenActive = () => cssFullscreen || isNativeFullscreen();

  const updateToolbarState = () => {
    const hasCanvasPages = pageEntries.length > 0;

    if (pageIndicator) {
      const displayTotal = Math.max(1, totalPages);
      const displayCurrent = Math.min(displayTotal, Math.max(1, currentPage));
      pageIndicator.textContent = `${displayCurrent} / ${displayTotal}`;
      pageIndicator.setAttribute?.(
        "aria-label",
        t("pdfViewer.pageStatus", { current: displayCurrent, total: displayTotal }),
      );
    }

    if (prevBtn) prevBtn.disabled = !hasCanvasPages || currentPage <= 1;
    if (nextBtn) nextBtn.disabled = !hasCanvasPages || currentPage >= totalPages;

    if (zoomValueBtn) {
      zoomValueBtn.textContent = formatZoomPercent(zoom);
      zoomValueBtn.disabled = !hasCanvasPages;
    }
    if (zoomOutBtn) zoomOutBtn.disabled = !hasCanvasPages || zoom <= PDF_ZOOM_MIN;
    if (zoomInBtn) zoomInBtn.disabled = !hasCanvasPages || zoom >= PDF_ZOOM_MAX;
    if (fitBtn) fitBtn.disabled = !hasCanvasPages;

    if (fullscreenBtn) {
      const active = isFullscreenActive();
      const label = t(active ? "pdfViewer.exitFullscreen" : "pdfViewer.fullscreen");
      fullscreenBtn.setAttribute?.("aria-pressed", String(active));
      fullscreenBtn.setAttribute?.("aria-label", label);
      fullscreenBtn.setAttribute?.("title", label);
      fullscreenBtn.innerHTML = active ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN_ENTER;
    }
  };

  const getFitBaseWidth = () => {
    const width = container.clientWidth || 720;
    return Math.max(280, Math.min(width - 32, isFullscreenActive() ? 1020 : 820));
  };

  const applyInstantZoomCss = () => {
    const baseWidth = getFitBaseWidth();
    for (const entry of pageEntries) {
      const fitScale = baseWidth / entry.baseViewport.width;
      const displayScale = fitScale * zoom;
      entry.canvas.style.width = `${Math.floor(entry.baseViewport.width * displayScale)}px`;
      entry.canvas.style.height = `${Math.floor(entry.baseViewport.height * displayScale)}px`;
    }
  };

  const renderAllPagesCrisp = async () => {
    if (!pdfDoc || pageEntries.length === 0 || !isActive()) return;
    const token = ++renderToken;
    const baseWidth = getFitBaseWidth();
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

    for (const entry of pageEntries) {
      if (!isActive() || token !== renderToken) return;
      const fitScale = baseWidth / entry.baseViewport.width;
      const displayScale = fitScale * zoom;
      const targetCssW = Math.floor(entry.baseViewport.width * displayScale);
      const targetCssH = Math.floor(entry.baseViewport.height * displayScale);

      const maxDimScale = Math.min(
        MAX_CANVAS_DIMENSION / entry.baseViewport.width,
        MAX_CANVAS_DIMENSION / entry.baseViewport.height,
      );
      const renderScale = Math.min(displayScale * dpr, maxDimScale);
      const renderViewport = entry.page.getViewport({ scale: renderScale });

      entry.canvas.style.width = `${targetCssW}px`;
      entry.canvas.style.height = `${targetCssH}px`;

      if (entry.renderedScale && Math.abs(entry.renderedScale - renderScale) < 0.02) {
        continue;
      }

      // Render onto an offscreen canvas first to avoid blanking the visible page during zoom.
      const buffer = document.createElement("canvas");
      buffer.width = Math.max(1, Math.floor(renderViewport.width));
      buffer.height = Math.max(1, Math.floor(renderViewport.height));
      const bufferCtx = buffer.getContext("2d");
      if (!bufferCtx) continue;

      await entry.page.render({
        canvasContext: bufferCtx,
        viewport: renderViewport,
      }).promise;

      if (!isActive() || token !== renderToken) return;

      entry.canvas.width = buffer.width;
      entry.canvas.height = buffer.height;
      const ctx = entry.canvas.getContext("2d");
      ctx?.drawImage(buffer, 0, 0);
      entry.renderedScale = renderScale;
    }
  };

  const scheduleCrispRender = () => {
    clearTimeout(zoomRenderTimer);
    zoomRenderTimer = setTimeout(() => {
      void renderAllPagesCrisp();
    }, ZOOM_RENDER_DEBOUNCE_MS);
  };

  const setZoom = (nextZoom) => {
    const clamped = clampZoom(nextZoom);
    if (clamped === zoom) return;
    zoom = clamped;
    applyInstantZoomCss();
    updateToolbarState();
    scheduleCrispRender();
  };

  const scrollToPage = (pageNum) => {
    if (pageEntries.length === 0) return;
    const clamped = Math.min(totalPages, Math.max(1, pageNum));
    currentPage = clamped;
    const target = pageEntries[clamped - 1]?.canvas;
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    updateToolbarState();
  };

  const syncCurrentPageFromScroll = () => {
    if (pageEntries.length <= 1) return;
    const containerRect = container.getBoundingClientRect?.();
    if (!containerRect) return;
    const midY = containerRect.top + containerRect.height * 0.4;
    let closestPage = currentPage;
    let closestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < pageEntries.length; i += 1) {
      const rect = pageEntries[i].canvas.getBoundingClientRect?.();
      if (!rect) continue;
      const pageMid = rect.top + rect.height / 2;
      const dist = Math.abs(pageMid - midY);
      if (dist < closestDist) {
        closestDist = dist;
        closestPage = i + 1;
      }
    }

    if (closestPage !== currentPage) {
      currentPage = closestPage;
      updateToolbarState();
    }
  };

  const applyCssFullscreen = (enabled) => {
    cssFullscreen = enabled;
    overlay?.classList?.toggle("pdf-modal-fullscreen", enabled);
    dialog?.classList?.toggle("pdf-modal-fullscreen", enabled);
    updateToolbarState();
    if (pageEntries.length > 0) {
      applyInstantZoomCss();
      scheduleCrispRender();
    }
  };

  const exitFullscreen = () => {
    if (isNativeFullscreen() && typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => {});
    }
    if (cssFullscreen) {
      applyCssFullscreen(false);
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreenActive()) {
      exitFullscreen();
      return;
    }

    if (dialog && typeof dialog.requestFullscreen === "function") {
      dialog.requestFullscreen().catch(() => {
        applyCssFullscreen(true);
      });
    } else {
      applyCssFullscreen(true);
    }
  };

  const handlePrint = () => {
    if (typeof document === "undefined") return;
    try {
      printFrame?.remove();
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.setAttribute("aria-hidden", "true");
      iframe.src = pdfUrl;
      iframe.addEventListener(
        "load",
        () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open?.(pdfUrl, "_blank", "noopener,noreferrer");
          }
        },
        { once: true },
      );
      document.body.appendChild(iframe);
      printFrame = iframe;
    } catch {
      window.open?.(pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleToolbarClick = (event) => {
    const btn = event.target?.closest?.("[data-pdf-action]");
    if (!btn || btn.disabled) return;
    const action = btn.getAttribute("data-pdf-action");
    if (action === "prev-page") {
      scrollToPage(currentPage - 1);
    } else if (action === "next-page") {
      scrollToPage(currentPage + 1);
    } else if (action === "zoom-out") {
      setZoom(zoom - PDF_ZOOM_STEP);
    } else if (action === "zoom-in") {
      setZoom(zoom + PDF_ZOOM_STEP);
    } else if (action === "zoom-reset" || action === "fit-width") {
      zoom = PDF_ZOOM_DEFAULT;
      applyInstantZoomCss();
      updateToolbarState();
      scheduleCrispRender();
    } else if (action === "fullscreen") {
      toggleFullscreen();
    } else if (action === "print") {
      handlePrint();
    }
  };

  const handleKeyDown = (event) => {
    if (!isActive()) return;
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (event.key === "Escape" && cssFullscreen && !isNativeFullscreen()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      applyCssFullscreen(false);
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(zoom + PDF_ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom(zoom - PDF_ZOOM_STEP);
    } else if (event.key === "0") {
      event.preventDefault();
      zoom = PDF_ZOOM_DEFAULT;
      applyInstantZoomCss();
      updateToolbarState();
      scheduleCrispRender();
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleFullscreen();
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      if (pageEntries.length > 1) {
        event.preventDefault();
        scrollToPage(currentPage - 1);
      }
    } else if (event.key === "ArrowRight" || event.key === "PageDown") {
      if (pageEntries.length > 1) {
        event.preventDefault();
        scrollToPage(currentPage + 1);
      }
    }
  };

  const handleFullscreenChange = () => {
    if (!isActive()) return;
    updateToolbarState();
    if (pageEntries.length > 0) {
      applyInstantZoomCss();
      scheduleCrispRender();
    }
  };

  const handleResize = () => {
    if (!isActive() || pageEntries.length === 0) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!isActive()) return;
      applyInstantZoomCss();
      scheduleCrispRender();
    }, ZOOM_RENDER_DEBOUNCE_MS);
  };

  toolbar?.addEventListener?.("click", handleToolbarClick);
  container.addEventListener?.("scroll", syncCurrentPageFromScroll, { passive: true });
  document?.addEventListener?.("keydown", handleKeyDown, { capture: true });
  document?.addEventListener?.("fullscreenchange", handleFullscreenChange);
  if (typeof window !== "undefined") {
    window.addEventListener?.("resize", handleResize, { passive: true });
  }

  updateToolbarState();

  const loadingText = escapeHtml(t("pdfViewer.loading"));
  container.innerHTML = `<p class="${PDF_MODAL_CLASSES.loading}">${loadingText}</p>`;

  void (async () => {
    try {
      const pdfjsLib = await loadPdfJs();
      const loadedPdf = await pdfjsLib.getDocument(pdfUrl).promise;
      if (!isActive()) return;

      pdfDoc = loadedPdf;
      totalPages = pdfDoc.numPages;
      currentPage = 1;

      const pagesEl = document.createElement("div");
      pagesEl.className = PDF_MODAL_CLASSES.pages;
      pageEntries = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
        const page = await pdfDoc.getPage(pageNum);
        if (!isActive()) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement("canvas");
        canvas.className = PDF_MODAL_CLASSES.canvas;
        canvas.dataset.pageNumber = String(pageNum);
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          t("pdfViewer.pageStatus", { current: pageNum, total: totalPages }),
        );

        pagesEl.appendChild(canvas);
        pageEntries.push({ page, baseViewport, canvas, renderedScale: 0 });
      }

      container.innerHTML = "";
      container.appendChild(pagesEl);
      applyInstantZoomCss();
      updateToolbarState();
      await renderAllPagesCrisp();
    } catch {
      if (!isActive()) return;
      pageEntries = [];
      totalPages = 0;
      container.innerHTML = createPdfIframeMarkup(pdfUrl, title);
      updateToolbarState();
    }
  })();

  return () => {
    disposed = true;
    renderToken += 1;
    clearTimeout(zoomRenderTimer);
    clearTimeout(resizeTimer);
    toolbar?.removeEventListener?.("click", handleToolbarClick);
    container.removeEventListener?.("scroll", syncCurrentPageFromScroll);
    document?.removeEventListener?.("keydown", handleKeyDown, { capture: true });
    document?.removeEventListener?.("fullscreenchange", handleFullscreenChange);
    if (typeof window !== "undefined") {
      window.removeEventListener?.("resize", handleResize);
    }
    if (isNativeFullscreen() && typeof document.exitFullscreen === "function") {
      void document.exitFullscreen().catch(() => {});
    }
    printFrame?.remove();
    printFrame = null;
  };
}
