import { buildAtsResumePdfBytes } from "./pdf-builder.js";
import { getTranslation } from "./i18n.js";

export const RESUME_FULL_NAME = "Aron Jake S. Radam";
export const RESUME_DEFAULT_LOCATION = "Caloocan City, Metro Manila";
export const RESUME_WEBSITE = "https://haruchanz64.github.io/";
export const RESUME_PDF_FILENAME = "Aron-Jake-S-Radam-Resume.pdf";

export const MIN_RESUME_PAGE_TIME_MS = 1200;
export const RESUME_COOLDOWN_MS = 2000;

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

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getElementEnglishText(el) {
  if (!el) return "";
  const i18nKey = el.getAttribute?.("data-i18n");
  if (i18nKey) {
    const translated = getTranslation("en", i18nKey);
    if (translated !== i18nKey) return normalizeText(translated);
  }
  const i18nHtmlKey = el.getAttribute?.("data-i18n-html");
  if (i18nHtmlKey) {
    const translated = getTranslation("en", i18nHtmlKey);
    if (translated !== i18nHtmlKey) return normalizeText(stripHtml(translated));
  }
  return normalizeText(el.textContent);
}

function getText(parent, selector) {
  const el = parent?.querySelector?.(selector);
  return getElementEnglishText(el);
}

/**
 * Extract structured resume data from the portfolio DOM, explicitly excluding `#about`.
 * @param {Document} doc
 */
export function extractResumeData(doc = document) {
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
        dateEl?.dataset?.dateRange || getElementEnglishText(dateEl),
      );
      const company = getText(item, ".experience-company");
      const location = getText(item, ".experience-location");
      const bullets = Array.from(item.querySelectorAll(".experience-list li"))
        .map((li) => getElementEnglishText(li))
        .filter(Boolean);

      return { role, date, company, location, bullets };
    })
    .filter((entry) => entry.role || entry.company);

  const location =
    experience.find((item) => item.location)?.location || RESUME_DEFAULT_LOCATION;

  const educationSection = doc.getElementById("education");
  const educationItems = educationSection
    ? Array.from(educationSection.querySelectorAll(".experience-item"))
    : [];

  const education = educationItems
    .map((item) => {
      const degree = getText(item, ".experience-role");
      const major = getText(item, ".experience-major");
      const dateEl = item.querySelector(".experience-date");
      const date = normalizeText(
        dateEl?.dataset?.dateRange || getElementEnglishText(dateEl),
      );
      const school = getText(item, ".experience-company");
      const eduLocation = getText(item, ".experience-location");
      const bullets = Array.from(item.querySelectorAll(".experience-list li"))
        .map((li) => getElementEnglishText(li))
        .filter(Boolean);
      return { degree, major, date, school, location: eduLocation, bullets };
    })
    .filter((entry) => entry.degree || entry.school);

  const skillsSection = doc.getElementById("skills");
  const skillTabs = skillsSection
    ? Array.from(skillsSection.querySelectorAll(".skill-tab"))
    : [];

  const skills = skillTabs
    .map((tab) => {
      const category = getElementEnglishText(tab);
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
    location,
    website: RESUME_WEBSITE,
    headline,
    links,
    experience,
    skills,
    education,
  };
}

/**
 * Build a clean, single-column, ATS-friendly HTML resume document.
 * @param {ReturnType<typeof extractResumeData>} data
 * @returns {string}
 */
export function buildAtsResumeHtml(data) {
  const contactParts = [];
  if (data.location) {
    contactParts.push(escapeHtml(data.location));
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

  const educationHtml = (data.education || [])
    .map((item) => {
      const metaParts = [item.school, item.location].filter(Boolean).map(escapeHtml);
      const bulletsHtml = item.bullets?.length
        ? `<ul>${item.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
        : "";
      return `
        <article class="resume-item">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(item.degree)}</h3>
            <span class="item-date">${escapeHtml(item.date)}</span>
          </div>
          ${item.major ? `<div class="item-subtitle">${escapeHtml(item.major)}</div>` : ""}
          ${metaParts.length ? `<div class="item-subtitle">${metaParts.join(" | ")}</div>` : ""}
          ${bulletsHtml}
        </article>`;
    })
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
    ${educationHtml ? `<section aria-labelledby="sec-edu"><h2 id="sec-edu">Education</h2>${educationHtml}</section>` : ""}
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
  if (data.location) contactParts.push(data.location);
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
    lines.push("");
  }

  if (data.education?.length) {
    lines.push("EDUCATION", "=========");
    for (const item of data.education) {
      lines.push(`${item.degree}${item.date ? ` (${item.date})` : ""}`);
      if (item.major) lines.push(item.major);
      const meta = [item.school, item.location].filter(Boolean).join(" | ");
      if (meta) lines.push(meta);
      for (const bullet of item.bullets || []) {
        lines.push(`- ${bullet}`);
      }
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
let lastTriggerEl = null;
let escapeListenerAttached = false;

function closeResumeModal() {
  if (!activeModal) return;
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

/**
 * Build the ATS-friendly PDF resume from the current portfolio DOM (excluding `#about`)
 * and display it in an accessible in-page preview modal with a manual Download Resume button.
 */
export function requestResume(triggerEl = null) {
  if (typeof document === "undefined") return null;

  const data = extractResumeData(document);
  const pdfBlob = buildAtsResumePdfBlob(data);
  const pdfUrl = URL.createObjectURL(pdfBlob);

  if (activeModal) {
    closeResumeModal();
  }

  activePdfUrl = pdfUrl;
  lastTriggerEl = triggerEl || document.activeElement;

  const safeTitle = escapeHtml(`${data.fullName} — Resume`);
  const safeFilename = escapeHtml(RESUME_PDF_FILENAME);
  const safeUrl = escapeHtml(pdfUrl);

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
          <a class="cta-button resume-download-btn" href="${safeUrl}" download="${safeFilename}">Download Resume</a>
          <button type="button" class="resume-modal-close" aria-label="Close resume preview">&times;</button>
        </div>
      </div>
      <div class="resume-preview-frame-wrap">
        <iframe class="resume-preview-frame" src="${safeUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit" title="${safeTitle}"></iframe>
      </div>
    </div>
  `;

  overlay.querySelector(".resume-modal-close").addEventListener("click", closeResumeModal);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeResumeModal();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  activeModal = overlay;

  if (!escapeListenerAttached) {
    escapeListenerAttached = true;
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeModal) {
        closeResumeModal();
      }
    });
  }

  overlay.querySelector(".resume-download-btn")?.focus();

  return { data, pdfUrl, filename: RESUME_PDF_FILENAME };
}
