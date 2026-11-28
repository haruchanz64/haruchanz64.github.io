import "./core/i18n.js";
import {
  cacheAllDocumentAssets,
  cacheAssetUrl,
  cacheImageElement,
  registerAssetCacheServiceWorker,
} from "./core/cache.js";
import { isMaintenanceMode, onDomReady, setButtonLoading } from "./core/dom.js";
import "./ui/theme.js";

registerAssetCacheServiceWorker();

let resumeModulePromise = null;

function loadResumeModule() {
  if (!resumeModulePromise) {
    resumeModulePromise = import("./resume/resume.js");
  }
  return resumeModulePromise;
}

function initResumeTrigger(isResumeRequestAllowed) {
  const pageLoadedAt = Date.now();
  let hasInteracted = false;
  let lastTriggeredAt = 0;

  const markHumanInteraction = (event) => {
    if (event.isTrusted) {
      hasInteracted = true;
    }
  };

  for (const eventName of ["pointermove", "pointerdown", "keydown", "touchstart", "scroll"]) {
    document.addEventListener(eventName, markHumanInteraction, { passive: true, capture: true });
  }

  document.addEventListener("click", async (event) => {
    const trigger = event.target.closest?.("[data-request-resume]");
    if (!trigger) return;
    event.preventDefault();

    if (trigger.disabled || trigger.getAttribute?.("aria-busy") === "true") {
      return;
    }

    const now = Date.now();
    if (
      !isResumeRequestAllowed({
        isTrusted: event.isTrusted === true,
        elapsedMs: now - pageLoadedAt,
        hasInteracted: hasInteracted || event.detail > 0,
        lastTriggeredAt,
        now,
      })
    ) {
      return;
    }

    lastTriggeredAt = now;
    setButtonLoading(trigger, true);
    try {
      const { requestResume } = await loadResumeModule();
      await requestResume(trigger);
    } finally {
      setButtonLoading(trigger, false);
    }
  });
}

async function initPortfolio() {
  const [{ sendEmail }, { isResumeRequestAllowed }] = await Promise.all([
    import("./contact/contact.js"),
    import("./resume/resume-guard.js"),
    import("./ui/observer.js"),
    import("./ui/url-hash-manager.js"),
    import("./ui/nav.js"),
    import("./ui/tabs.js"),
    import("./projects/github.js"),
    import("./projects/itch.js"),
    import("./ui/hero-loader.js"),
    import("./ui/experience-duration.js"),
    import("./ui/about-handle.js"),
    import("./ui/case-study.js"),
  ]);

  initResumeTrigger(isResumeRequestAllowed);
  window.sendEmail = sendEmail;
  window.requestResume = async (triggerEl = null) => {
    const { requestResume } = await loadResumeModule();
    return requestResume(triggerEl);
  };
}

if (isMaintenanceMode()) {
  void onDomReady(() => {
    const maintenanceView = document.getElementById("maintenance-view");
    if (maintenanceView) {
      maintenanceView.hidden = false;
      maintenanceView.inert = false;
    }
    document.querySelectorAll("#maintenance-view img[src]").forEach((img) => {
      void cacheImageElement(img);
    });
    document.querySelectorAll('link[rel*="icon"][href]').forEach((link) => {
      const href = link.dataset?.originalHref || link.getAttribute("href");
      if (href) {
        void cacheAssetUrl(href);
      }
      for (const variantHref of [link.dataset?.faviconDark, link.dataset?.faviconLight]) {
        if (variantHref && variantHref !== href) {
          void cacheAssetUrl(variantHref);
        }
      }
    });
  });
} else {
  void onDomReady(() => {
    const maintenanceView = document.getElementById("maintenance-view");
    if (maintenanceView) {
      maintenanceView.hidden = true;
      maintenanceView.inert = true;
    }
    void cacheAllDocumentAssets(document);
  });
  void initPortfolio();
}
