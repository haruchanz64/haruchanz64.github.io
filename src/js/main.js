import "./i18n.js";
import { sendEmail } from "./contact.js";
import "./observer.js";
import "./url-hash-manager.js";
import "./theme.js";
import "./nav.js";
import "./tabs.js";
import "./github.js";
import "./itch.js";
import "./hero-loader.js";
import "./experience-duration.js";
import "./about-handle.js";

const RESUME_MIN_PAGE_TIME_MS = 1200;
const RESUME_COOLDOWN_MS = 2000;
let resumeModulePromise = null;

function loadResumeModule() {
  if (!resumeModulePromise) {
    resumeModulePromise = import("./resume.js");
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

    const now = Date.now();
    if (
      event.isTrusted !== true ||
      now - pageLoadedAt < RESUME_MIN_PAGE_TIME_MS ||
      !(hasInteracted || event.detail > 0) ||
      (lastTriggeredAt > 0 && now - lastTriggeredAt < RESUME_COOLDOWN_MS)
    ) {
      return;
    }

    lastTriggeredAt = now;
    const { requestResume } = await loadResumeModule();
    requestResume(trigger);
  });
}

initResumeTrigger();

window.sendEmail = sendEmail;
window.requestResume = async (triggerEl = null) => {
  const { requestResume } = await loadResumeModule();
  return requestResume(triggerEl);
};
