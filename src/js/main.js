import "./core/i18n.js";
import { cacheAllDocumentAssets, registerAssetCacheServiceWorker } from "./core/cache.js";
import { sendEmail } from "./contact/contact.js";
import { onDomReady, setButtonLoading } from "./core/dom.js";
import { isResumeRequestAllowed } from "./resume/resume-guard.js";
import "./ui/observer.js";
import "./ui/url-hash-manager.js";
import "./ui/theme.js";
import "./ui/nav.js";
import "./ui/tabs.js";
import "./projects/github.js";
import "./projects/itch.js";
import "./ui/hero-loader.js";
import "./ui/experience-duration.js";
import "./ui/about-handle.js";

registerAssetCacheServiceWorker();
void onDomReady(() => {
  void cacheAllDocumentAssets(document);
});

let resumeModulePromise = null;

function loadResumeModule() {
  if (!resumeModulePromise) {
    resumeModulePromise = import("./resume/resume.js");
  }
  return resumeModulePromise;
}

function initResumeTrigger() {
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

initResumeTrigger();

window.sendEmail = sendEmail;
window.requestResume = async (triggerEl = null) => {
  const { requestResume } = await loadResumeModule();
  return requestResume(triggerEl);
};
