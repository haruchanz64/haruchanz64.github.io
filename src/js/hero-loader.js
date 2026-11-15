import { githubProjectsReady } from "./github.js";
import { itchProjectsReady } from "./itch.js";

const INTRO_SEEN_KEY = "has_seen_intro";
const MIN_LOADING_MS = 1500;
const MAX_WAIT_MS = 3500;
const MORPH_TRANSITION_MS = 650;

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "true");
  } catch {
    // Ignore storage errors in restricted browsing contexts.
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForWindowLoad() {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    window.addEventListener("load", resolve, { once: true });
  });
}

function startProgressTicker(progressEl, minMs) {
  if (!progressEl) return () => Promise.resolve();

  let done = false;
  let current = 0;
  const start = performance.now();

  function tick(now) {
    if (done) return;
    const elapsed = now - start;
    const t = Math.min(elapsed / minMs, 1);
    // Ease out toward 92% over MIN_LOADING_MS, leaving 92->100% for completion.
    const eased = 1 - Math.pow(1 - t, 3);
    current = Math.max(current, Math.floor(eased * 92));
    progressEl.textContent = `${current}%`;
    if (t < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);

  return function completeProgress() {
    done = true;
    const finishStart = performance.now();
    const startVal = current;
    const finishDuration = 140;

    return new Promise((resolve) => {
      function step(now) {
        const p = Math.min((now - finishStart) / finishDuration, 1);
        const val = Math.round(startVal + (100 - startVal) * p);
        progressEl.textContent = `${val}%`;
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  };
}

function lockScroll() {
  document.documentElement.classList.add("intro-loading");
}

function unlockScroll() {
  document.documentElement.classList.remove("intro-loading");
}

function swapToDedicatedHero() {
  const loadingHero = document.getElementById("hero-loading");
  const dedicatedHero = document.getElementById("hero");
  if (!dedicatedHero) {
    unlockScroll();
    return;
  }

  const loadingAvatar = loadingHero?.querySelector(".hero-avatar--loading");
  const targetAvatar = dedicatedHero.querySelector(".hero-avatar");

  let morphTransform = null;
  if (loadingAvatar && targetAvatar) {
    // Freeze pulse animation before measuring so fromRect matches scale(1).
    loadingAvatar.classList.add("is-morphing");
    loadingAvatar.style.transform = "none";

    const fromRect = loadingAvatar.getBoundingClientRect();
    const toRect = targetAvatar.getBoundingClientRect();

    if (fromRect.width > 0 && toRect.width > 0) {
      const dx =
        toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
      const dy =
        toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
      const scale = toRect.width / fromRect.width;
      morphTransform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    }
  }

  dedicatedHero.classList.remove("hero--pending");
  dedicatedHero.removeAttribute("aria-hidden");
  dedicatedHero.inert = false;

  if (!loadingHero) {
    unlockScroll();
    return;
  }

  if (morphTransform && loadingAvatar) {
    dedicatedHero.classList.add("hero--morphing");
    loadingHero.classList.add("is-leaving");
    loadingHero.setAttribute("aria-hidden", "true");

    // Force style flush so the transition starts from transform: none.
    void loadingAvatar.offsetWidth;
    loadingAvatar.style.transform = morphTransform;

    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      dedicatedHero.classList.remove("hero--morphing");
      loadingHero.hidden = true;
      unlockScroll();
    };

    loadingAvatar.addEventListener("transitionend", finalize, { once: true });
    setTimeout(finalize, MORPH_TRANSITION_MS + 100);
    return;
  }

  loadingHero.classList.add("is-leaving");
  loadingHero.setAttribute("aria-hidden", "true");
  loadingHero.hidden = true;
  unlockScroll();
}

/**
 * Keep the minimal loading hero visible while async portfolio data and assets
 * load, then shrink the avatar into place in the dedicated hero section.
 */
export async function initHeroLoader() {
  const loadingHero = document.getElementById("hero-loading");
  const dedicatedHero = document.getElementById("hero");
  if (!loadingHero || !dedicatedHero) {
    unlockScroll();
    return;
  }

  if (hasSeenIntro()) {
    unlockScroll();
    dedicatedHero.classList.remove("hero--pending");
    dedicatedHero.removeAttribute("aria-hidden");
    dedicatedHero.inert = false;
    loadingHero.setAttribute("aria-hidden", "true");
    loadingHero.hidden = true;
    return;
  }

  lockScroll();

  try {
    const progressEl = loadingHero.querySelector(".hero-loading-progress");
    const completeProgress = startProgressTicker(progressEl, MIN_LOADING_MS);

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const portfolioReady = Promise.allSettled([
      githubProjectsReady,
      itchProjectsReady,
      waitForWindowLoad(),
      fontsReady,
    ]);

    await Promise.all([
      delay(MIN_LOADING_MS),
      Promise.race([portfolioReady, delay(MAX_WAIT_MS)]),
    ]);

    await completeProgress();
    markIntroSeen();
    requestAnimationFrame(swapToDedicatedHero);
  } catch (error) {
    unlockScroll();
    throw error;
  }
}

initHeroLoader();
