import { buildAtsResumePdfBytes } from "./pdf-builder.js";

export const RESUME_FULL_NAME = "Aron Jake S. Radam";
export const RESUME_WEBSITE = "https://haruchanz64.github.io/";
export const RESUME_PDF_FILENAME = "Aron-Jake-S-Radam-Resume.pdf";

export const MIN_RESUME_PAGE_TIME_MS = 1200;
export const RESUME_COOLDOWN_MS = 2000;

const CHAR_OFFSET = 7;
const ENCODED_PHONE = [47, 50, 61, 58, 48, 39, 64, 61, 56, 39, 57, 57, 61, 39, 57, 55, 63, 58];
const ENCODED_EMAIL = [
  121, 104, 107, 104, 116, 53, 104, 121, 118, 117, 113, 104,
  114, 108, 71, 110, 116, 104, 112, 115, 53, 106, 118, 116,
];

const TURNSTILE_SITE_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_TURNSTILE_SITE_KEY) ||
  "0x4AAAAAAGAwbWneFQYFo-Nq";
const DEFAULT_RESUME_GATE_URL =
  typeof window !== "undefined" && window.location.hostname.endsWith(".workers.dev")
    ? "/api/resume-gate"
    : "https://haru-portfolio.haruchanz64.workers.dev/api/resume-gate";
const RESUME_GATE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_RESUME_GATE_URL) ||
  DEFAULT_RESUME_GATE_URL;

function decodeContact(codes, offset = CHAR_OFFSET) {
  return String.fromCharCode(...codes.map((code) => code - offset));
}

export function getResumePhone() {
  return decodeContact(ENCODED_PHONE);
}

export function getResumeEmail() {
  return decodeContact(ENCODED_EMAIL);
}

/**
 * Verify that a resume trigger came from a real, human-paced interaction.
 */
export function isResumeRequestAllowed({
  isTrusted = false,
  elapsedMs = 0,
  hasInteracted = false,
  lastTriggeredAt = 0,
  now = Date.now(),
} = {}) {
  if (!isTrusted) return false;
  if (!hasInteracted) return false;
  if (elapsedMs < MIN_RESUME_PAGE_TIME_MS) return false;
  if (lastTriggeredAt > 0 && now - lastTriggeredAt < RESUME_COOLDOWN_MS) return false;
  return true;
}

const DEFAULT_HEADLINE = "Software Engineer & College Instructor";

const PREFERRED_LINK_LABELS = new Set(["LinkedIn", "GitHub"]);

/**
 * Collapse consecutive whitespace into single spaces and trim.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Escape special HTML characters for safe interpolation into generated HTML.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getText(parent, selector) {
  const el = parent?.querySelector?.(selector);
  return normalizeText(el?.textContent);
}

/**
 * Extract structured resume data from the portfolio DOM, explicitly excluding `#about`.
 * @param {Document} doc
 * @param {{ phone?: string, email?: string } | null} contactOverride
 */
export function extractResumeData(doc = document, contactOverride = null) {
  const headline =
    getText(doc, ".nav-brand-role") || DEFAULT_HEADLINE;

  const experienceSection = doc.getElementById("experience");
  const experienceItems = experienceSection
    ? Array.from(experienceSection.querySelectorAll(".experience-item"))
    : [];

  const experience = experienceItems
    .map((item) => {
      const role = getText(item, ".experience-role");
      const dateEl = item.querySelector(".experience-date");
      const date = normalizeText(
        dateEl?.dataset?.dateRange || dateEl?.textContent,
      );
      const company = getText(item, ".experience-company");
      const location = getText(item, ".experience-location");
      const bullets = Array.from(item.querySelectorAll(".experience-list li"))
        .map((li) => normalizeText(li.textContent))
        .filter(Boolean);

      return { role, date, company, location, bullets };
    })
    .filter((entry) => entry.role || entry.company);

  const location = experience.find((item) => item.location)?.location || "";

  const skillsSection = doc.getElementById("skills");
  const skillTabs = skillsSection
    ? Array.from(skillsSection.querySelectorAll(".skill-tab"))
    : [];

  const skills = skillTabs
    .map((tab) => {
      const category = normalizeText(tab.textContent);
      const targetId = tab.getAttribute("data-skill") || tab.getAttribute("aria-controls");
      const panel = targetId ? doc.getElementById(targetId) : null;
      const items = panel
        ? Array.from(panel.querySelectorAll(".skill-name"))
            .map((el) => normalizeText(el.textContent))
            .filter(Boolean)
        : [];
      return { category, items };
    })
    .filter((group) => group.category && group.items.length > 0);

  const contactSection = doc.getElementById("contact");
  const rawLinks = contactSection
    ? Array.from(contactSection.querySelectorAll(".social-links a"))
        .map((a) => ({
          label: normalizeText(a.getAttribute("aria-label") || a.textContent),
          url: normalizeText(a.getAttribute("href") || a.href),
        }))
        .filter((link) => link.label && link.url)
    : [];

  const preferredLinks = rawLinks.filter((l) => PREFERRED_LINK_LABELS.has(l.label));
  const links = preferredLinks.length > 0 ? preferredLinks : rawLinks;

  return {
    fullName: RESUME_FULL_NAME,
    phone: contactOverride?.phone ?? getResumePhone(),
    email: contactOverride?.email ?? getResumeEmail(),
    website: RESUME_WEBSITE,
    headline,
    location,
    links,
    experience,
    skills,
  };
}

/**
 * Build a clean, single-column, ATS-friendly HTML resume document.
 * @param {ReturnType<typeof extractResumeData>} data
 * @returns {string}
 */
export function buildAtsResumeHtml(data) {
  const contactParts = [];
  if (data.phone) {
    contactParts.push(escapeHtml(data.phone));
  }
  if (data.email) {
    contactParts.push(
      `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>`,
    );
  }
  if (data.website) {
    contactParts.push(
      `<a href="${escapeHtml(data.website)}">${escapeHtml(data.website)}</a>`,
    );
  }
  for (const link of data.links || []) {
    contactParts.push(
      `<a href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a>`,
    );
  }

  const experienceHtml = (data.experience || [])
    .map((item) => {
      const metaParts = [item.company, item.location].filter(Boolean).map(escapeHtml);
      const bulletsHtml = item.bullets
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");

      return `
        <article class="resume-item">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(item.role)}</h3>
            <span class="item-date">${escapeHtml(item.date)}</span>
          </div>
          ${metaParts.length ? `<div class="item-subtitle">${metaParts.join(" | ")}</div>` : ""}
          ${bulletsHtml ? `<ul>${bulletsHtml}</ul>` : ""}
        </article>`;
    })
    .join("");

  const skillsHtml = (data.skills || [])
    .map(
      (group) =>
        `<p class="skill-row"><strong>${escapeHtml(group.category)}:</strong> ${escapeHtml(
          group.items.join(", "),
        )}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(data.fullName)} - Resume</title>
  <style>
    @page {
      size: A4;
      margin: 0.55in 0.6in;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.4;
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 0.55in 0.6in;
      max-width: 8.5in;
      margin-left: auto;
      margin-right: auto;
    }
    @media print {
      body {
        padding: 0;
        max-width: none;
      }
    }
    header {
      margin-bottom: 12pt;
      border-bottom: 1.5pt solid #111111;
      padding-bottom: 8pt;
    }
    h1 {
      font-size: 18pt;
      margin: 0 0 2pt 0;
      letter-spacing: 0.2pt;
    }
    .headline {
      font-size: 11pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    .contact-line {
      font-size: 9.5pt;
      color: #222222;
      margin: 0;
    }
    .contact-line a,
    .item-date a {
      color: #111111;
      text-decoration: none;
    }
    section {
      margin-bottom: 11pt;
    }
    h2 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.6pt;
      border-bottom: 1pt solid #333333;
      padding-bottom: 2pt;
      margin: 0 0 6pt 0;
    }
    .group-title {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #333333;
      margin: 6pt 0 4pt 0;
    }
    .resume-item {
      margin-bottom: 7pt;
      break-inside: avoid;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12pt;
    }
    .item-title {
      font-size: 10.5pt;
      font-weight: bold;
      margin: 0;
    }
    .item-date {
      font-size: 9.5pt;
      white-space: nowrap;
    }
    .item-subtitle {
      font-size: 10pt;
      font-style: italic;
      margin: 1pt 0 3pt 0;
    }
    .item-desc {
      font-size: 10pt;
      margin: 2pt 0 0 0;
    }
    ul {
      margin: 2pt 0 0 0;
      padding-left: 16pt;
    }
    li {
      margin-bottom: 2pt;
    }
    .skill-row {
      margin: 0 0 3pt 0;
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(data.fullName)}</h1>
    ${data.headline ? `<p class="headline">${escapeHtml(data.headline)}</p>` : ""}
    ${contactParts.length ? `<p class="contact-line">${contactParts.join(" | ")}</p>` : ""}
  </header>
  <main>
    ${experienceHtml ? `<section aria-labelledby="sec-exp"><h2 id="sec-exp">Experience</h2>${experienceHtml}</section>` : ""}
    ${skillsHtml ? `<section aria-labelledby="sec-skills"><h2 id="sec-skills">Technical Skills</h2>${skillsHtml}</section>` : ""}
  </main>
</body>
</html>`;
}

/**
 * Build a plain-text ATS-friendly resume.
 * @param {ReturnType<typeof extractResumeData>} data
 * @returns {string}
 */
export function buildAtsResumeText(data) {
  const lines = [data.fullName];
  if (data.headline) lines.push(data.headline);

  const contactParts = [];
  if (data.phone) contactParts.push(data.phone);
  if (data.email) contactParts.push(data.email);
  if (data.website) contactParts.push(data.website);
  for (const link of data.links || []) {
    contactParts.push(link.url);
  }
  if (contactParts.length) lines.push(contactParts.join(" | "));

  if (data.experience?.length) {
    lines.push("", "EXPERIENCE", "==========");
    for (const item of data.experience) {
      lines.push(`${item.role}${item.date ? ` (${item.date})` : ""}`);
      const meta = [item.company, item.location].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      for (const bullet of item.bullets || []) {
        lines.push(`- ${bullet}`);
      }
      lines.push("");
    }
  }

  if (data.skills?.length) {
    lines.push("TECHNICAL SKILLS", "================");
    for (const group of data.skills) {
      lines.push(`${group.category}: ${group.items.join(", ")}`);
    }
  }

  return lines.join("\n").trim() + "\n";
}

/**
 * Build an ATS-friendly PDF File/Blob from extracted resume data.
 * @param {ReturnType<typeof extractResumeData>} data
 * @returns {Blob}
 */
export function buildAtsResumePdfBlob(data) {
  const bytes = buildAtsResumePdfBytes(data);
  if (typeof File === "function") {
    return new File([bytes], RESUME_PDF_FILENAME, { type: "application/pdf" });
  }
  return new Blob([bytes], { type: "application/pdf" });
}

let activeModal = null;
let activePdfUrl = null;
let activeTurnstileWidgetId = null;
let lastTriggerEl = null;

function closeResumeModal() {
  if (!activeModal) return;
  if (
    activeTurnstileWidgetId !== null &&
    typeof window !== "undefined" &&
    window.turnstile?.remove
  ) {
    try {
      window.turnstile.remove(activeTurnstileWidgetId);
    } catch {
      // Ignore cleanup errors if widget was already removed.
    }
    activeTurnstileWidgetId = null;
  }
  activeModal.remove();
  activeModal = null;
  if (activePdfUrl) {
    URL.revokeObjectURL(activePdfUrl);
    activePdfUrl = null;
  }
  document.body.style.overflow = "";
  if (lastTriggerEl && typeof lastTriggerEl.focus === "function") {
    lastTriggerEl.focus();
  }
  lastTriggerEl = null;
}

function renderPdfPreviewInModal(overlay, contactOverride = null) {
  const data = extractResumeData(document, contactOverride);
  const pdfBlob = buildAtsResumePdfBlob(data);
  const pdfUrl = URL.createObjectURL(pdfBlob);

  if (activePdfUrl) {
    URL.revokeObjectURL(activePdfUrl);
  }
  activePdfUrl = pdfUrl;

  const safeTitle = escapeHtml(`${data.fullName} — Resume`);
  const safeFilename = escapeHtml(RESUME_PDF_FILENAME);
  const safeUrl = escapeHtml(pdfUrl);

  const controls = overlay.querySelector(".resume-modal-controls");
  const body = overlay.querySelector(".resume-modal-body");

  controls.innerHTML = `
    <a class="cta-button resume-download-btn" href="${safeUrl}" download="${safeFilename}">Download Resume</a>
    <button type="button" class="resume-modal-close" aria-label="Close resume preview">&times;</button>
  `;
  controls.querySelector(".resume-modal-close").addEventListener("click", closeResumeModal);

  body.className = "resume-modal-body resume-preview-frame-wrap";
  body.innerHTML = `
    <iframe class="resume-preview-frame" src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="${safeTitle}"></iframe>
  `;

  controls.querySelector(".resume-download-btn")?.focus();
  return { data, pdfUrl, filename: RESUME_PDF_FILENAME };
}

async function verifyTurnstileToken(token) {
  const response = await fetch(RESUME_GATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`Verification failed (${response.status})`);
  }

  return response.json();
}

/**
 * Build the ATS-friendly PDF resume from the current portfolio DOM (excluding `#about`)
 * and display it in an accessible in-page preview modal with a manual Download Resume button.
 * When `VITE_TURNSTILE_SITE_KEY` and `VITE_RESUME_GATE_URL` are configured, verifies
 * human interaction via Cloudflare Turnstile + Worker before generating the PDF.
 */
export function requestResume(triggerEl = null) {
  if (typeof document === "undefined") return null;

  if (activeModal) {
    closeResumeModal();
  }

  lastTriggerEl = triggerEl || document.activeElement;
  const safeTitle = escapeHtml(`${RESUME_FULL_NAME} — Resume`);

  const overlay = document.createElement("div");
  overlay.id = "resume-modal";
  overlay.className = "resume-modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "resume-modal-title");

  overlay.innerHTML = `
    <div class="resume-modal">
      <div class="resume-modal-header">
        <div>
          <h2 id="resume-modal-title" class="resume-modal-title">${safeTitle}</h2>
        </div>
        <div class="resume-modal-controls">
          <button type="button" class="resume-modal-close" aria-label="Close resume preview">&times;</button>
        </div>
      </div>
      <div class="resume-modal-body"></div>
    </div>
  `;

  overlay.querySelector(".resume-modal-close").addEventListener("click", closeResumeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeResumeModal();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  activeModal = overlay;

  const isTurnstileEnabled =
    Boolean(TURNSTILE_SITE_KEY) &&
    typeof window !== "undefined" &&
    Boolean(window.turnstile?.render);

  if (!isTurnstileEnabled) {
    return renderPdfPreviewInModal(overlay);
  }

  const body = overlay.querySelector(".resume-modal-body");
  body.className = "resume-modal-body resume-gate-panel";
  body.innerHTML = `
    <p class="resume-gate-message">Quick human verification before loading the resume…</p>
    <div id="resume-turnstile-widget"></div>
    <p class="resume-gate-error" role="alert" hidden></p>
  `;

  const errorEl = body.querySelector(".resume-gate-error");
  const messageEl = body.querySelector(".resume-gate-message");

  activeTurnstileWidgetId = window.turnstile.render("#resume-turnstile-widget", {
    sitekey: TURNSTILE_SITE_KEY,
    theme: document.documentElement.classList.contains("light-theme") ? "light" : "dark",
    callback: async (token) => {
      if (!RESUME_GATE_URL) {
        if (!activeModal) return;
        renderPdfPreviewInModal(overlay);
        return;
      }

      messageEl.textContent = "Verifying…";
      errorEl.hidden = true;
      try {
        const contact = await verifyTurnstileToken(token);
        if (!activeModal) return;
        renderPdfPreviewInModal(overlay, contact);
      } catch (err) {
        console.error("Resume gate verification error:", err);
        messageEl.textContent = "Verification failed. Please try again.";
        errorEl.textContent = "Unable to verify right now. Please refresh or use the contact form.";
        errorEl.hidden = false;
        window.turnstile?.reset?.(activeTurnstileWidgetId);
      }
    },
    "error-callback": () => {
      errorEl.textContent = "Verification challenge could not load. Please disable strict blockers or try again.";
      errorEl.hidden = false;
    },
  });

  return { gated: true, filename: RESUME_PDF_FILENAME };
}

function initResumeTriggers() {
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

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-request-resume]");
    if (!trigger) return;
    event.preventDefault();

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
    requestResume(trigger);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeModal) {
      closeResumeModal();
    }
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initResumeTriggers);
  } else {
    initResumeTriggers();
  }
}
