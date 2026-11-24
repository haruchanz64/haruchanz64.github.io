import { bindModalDismiss, setButtonLoading } from "../core/dom.js";
import { DEFAULT_LOCALE, getTranslation, t } from "../core/i18n.js";
import {
  createPdfToolbarMarkup,
  mountPdfViewer,
  PDF_MODAL_CLASSES,
} from "../ui/pdf-preview.js";
import { buildAtsResumePdfBytes, formatCompanyForResume, formatDisplayUrl } from "./pdf-builder.js";

export {
  isResumeRequestAllowed,
  MIN_RESUME_PAGE_TIME_MS,
  RESUME_COOLDOWN_MS,
} from "./resume-guard.js";

import { escapeHtml, normalizeText, stripHtml } from "../core/text.js";

export { escapeHtml, formatCompanyForResume, formatDisplayUrl, normalizeText };

import { fetchLatestGithubProjects } from "../projects/github.js";
import { buildResumeSelectedProjects } from "../projects/project-details.js";

export const RESUME_FULL_NAME = "Aron Jake S. Radam";
export const RESUME_DEFAULT_LOCATION = "Caloocan City, Metro Manila, Philippines";
export const RESUME_WEBSITE = "https://haruchanz64.github.io/";
export const RESUME_PDF_FILENAME = "Aron-Jake-S-Radam-Resume.pdf";

export const RESUME_DEFAULT_HEADLINE =
  "Game Developer | Gameplay Systems, Unity Tooling, and Technical Game Design";

const SHORT_NAV_HEADLINES = new Set(["Game Developer · Systems, Tools & Technical Design"]);

const PREFERRED_LINK_ORDER = ["LinkedIn", "GitHub", "itch.io"];
const PREFERRED_LINK_LABELS = new Set(PREFERRED_LINK_ORDER);

const RESUME_EXCLUDED_TOOLS = new Set([
  "Visual Studio Code",
  "Android Studio",
  "IntelliJ IDEA",
  "Notion",
  "Postman",
  "Antigravity",
  "Claude Code",
]);

const RESUME_CORE_COMPETENCIES = {
  category: "Game Development & Quality Assurance",
  items: [
    "Gameplay Programming",
    "Unity Editor Tooling",
    "Technical Game Design",
    "Systems Architecture",
    "Object-Oriented Programming (OOP)",
    "REST APIs",
    "Quality Assurance (QA)",
    "Regression Testing",
    "Playtesting",
  ],
};

const RESUME_SPOKEN_LANGUAGES = {
  category: "Spoken Languages",
  items: ["English (Fluent)", "Filipino (Native)"],
};

function curateResumeSkillGroup(category, items) {
  const normalizedCategory = category === "Languages" ? "Programming Languages" : category;

  if (normalizedCategory === "Engines & Frameworks") {
    const expanded = [];
    for (const item of items) {
      if (item === "Unity") {
        expanded.push(
          "Unity",
          "Unity 6",
          "Unity UI Toolkit",
          "Universal Render Pipeline (URP)",
          "ScriptableObjects",
          "Unity Package Manager (UPM)",
          "Unity Input System",
          "Playables API",
          "Netcode for GameObjects (NGO)",
          "Mirror",
          "FishNet",
        );
      } else {
        expanded.push(item);
      }
    }
    return { category: normalizedCategory, items: expanded };
  }

  if (normalizedCategory === "Tools & Software") {
    const filtered = items.filter((item) => !RESUME_EXCLUDED_TOOLS.has(item));
    const curated = filtered.length > 0 ? [...filtered] : [...items];
    return { category: normalizedCategory, items: curated };
  }

  return { category: normalizedCategory, items };
}

function getElementEnglishText(el) {
  if (!el) return "";
  const i18nKey = el.getAttribute?.("data-i18n");
  if (i18nKey) {
    const translated = getTranslation(DEFAULT_LOCALE, i18nKey);
    if (translated !== i18nKey) return normalizeText(translated);
  }
  const i18nHtmlKey = el.getAttribute?.("data-i18n-html");
  if (i18nHtmlKey) {
    const translated = getTranslation(DEFAULT_LOCALE, i18nHtmlKey);
    if (translated !== i18nHtmlKey) return normalizeText(stripHtml(translated));
  }
  return normalizeText(el.textContent);
}

function getText(parent, selector) {
  const el = parent?.querySelector?.(selector);
  return getElementEnglishText(el);
}

function extractTimelineItems(doc, sectionId) {
  const section = doc.getElementById(sectionId);
  if (!section) return [];

  return Array.from(section.querySelectorAll(".experience-item")).map((item) => {
    const dateEl = item.querySelector(".experience-date");
    const hasI18nDate = Boolean(
      dateEl?.getAttribute?.("data-i18n") || dateEl?.getAttribute?.("data-i18n-html"),
    );
    return {
      title: getText(item, ".experience-role"),
      major: getText(item, ".experience-major"),
      date: normalizeText(
        hasI18nDate
          ? getElementEnglishText(dateEl)
          : dateEl?.dataset?.dateRange || getElementEnglishText(dateEl),
      ),
      organization: getText(item, ".experience-company"),
      location: getText(item, ".experience-location"),
      bullets: Array.from(item.querySelectorAll(".experience-list li"))
        .map((li) => getElementEnglishText(li))
        .filter(Boolean),
    };
  });
}

/**
 * Extract structured resume data from the portfolio DOM, explicitly excluding `#about`.
 * @param {Document} doc
 * @param {{ githubRepos?: Array<{ name: string, html_url?: string, description?: string, language?: string }> | null }} [options]
 */
export function extractResumeData(doc = document, { githubRepos = null } = {}) {
  const rawHeadline = getText(doc, ".nav-brand-role");
  const headline =
    !rawHeadline || SHORT_NAV_HEADLINES.has(rawHeadline) ? RESUME_DEFAULT_HEADLINE : rawHeadline;

  const experience = extractTimelineItems(doc, "experience")
    .map(({ title, date, organization, location, bullets }) => ({
      role: title,
      date,
      company: organization,
      location,
      bullets,
    }))
    .filter((entry) => entry.role || entry.company);

  const location = experience.find((item) => item.location)?.location || RESUME_DEFAULT_LOCATION;

  const education = extractTimelineItems(doc, "education")
    .map(({ title, major, date, organization, location: eduLocation, bullets }) => ({
      degree: title,
      major,
      date,
      school: organization,
      location: eduLocation,
      bullets,
    }))
    .filter((entry) => entry.degree || entry.school);

  const skillsSection = doc.getElementById("skills");
  const skillTabs = skillsSection ? Array.from(skillsSection.querySelectorAll(".skill-tab")) : [];

  const skills = skillTabs
    .map((tab) => {
      const category = getElementEnglishText(tab);
      const targetId = tab.getAttribute("data-skill") || tab.getAttribute("aria-controls");
      const panel = targetId ? doc.getElementById(targetId) : null;
      const items = panel
        ? Array.from(panel.querySelectorAll(".skill-name"))
            .map((el) => getElementEnglishText(el))
            .filter(Boolean)
        : [];
      return curateResumeSkillGroup(category, items);
    })
    .filter((group) => group.category && group.items.length > 0);

  const langIdx = skills.findIndex((group) => group.category === "Programming Languages");
  if (langIdx !== -1) {
    skills.splice(langIdx + 1, 0, RESUME_CORE_COMPETENCIES);
  } else {
    skills.push(RESUME_CORE_COMPETENCIES);
  }

  skills.push(RESUME_SPOKEN_LANGUAGES);

  const contactSection = doc.getElementById("contact");
  const rawLinks = contactSection
    ? Array.from(contactSection.querySelectorAll(".social-links a"))
        .map((a) => ({
          label: normalizeText(a.getAttribute("aria-label") || a.textContent),
          url: normalizeText(a.getAttribute("href") || a.href),
        }))
        .filter((link) => link.label && link.url)
    : [];

  const preferredLinks = rawLinks
    .filter((l) => PREFERRED_LINK_LABELS.has(l.label))
    .sort((a, b) => PREFERRED_LINK_ORDER.indexOf(a.label) - PREFERRED_LINK_ORDER.indexOf(b.label));
  const links = preferredLinks.length > 0 ? preferredLinks : rawLinks;

  const projects = buildResumeSelectedProjects(githubRepos);

  return {
    fullName: RESUME_FULL_NAME,
    location,
    website: RESUME_WEBSITE,
    headline,
    links,
    experience,
    projects,
    skills,
    education,
  };
}

function renderResumeArticleHtml({
  title,
  date,
  major = "",
  org = "",
  location = "",
  bullets = [],
}) {
  const metaParts = [org, location].filter(Boolean).map(escapeHtml);
  const bulletsHtml = bullets.length
    ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";

  return `
        <article class="resume-item">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(title)}</h3>
            <span class="item-date">${escapeHtml(date)}</span>
          </div>
          ${major ? `<div class="item-subtitle">${escapeHtml(major)}</div>` : ""}
          ${metaParts.length ? `<div class="item-subtitle">${metaParts.join(" | ")}</div>` : ""}
          ${bulletsHtml}
        </article>`;
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
      `<a href="${escapeHtml(data.website)}">${escapeHtml(formatDisplayUrl(data.website))}</a>`,
    );
  }
  for (const link of data.links || []) {
    contactParts.push(
      `<a href="${escapeHtml(link.url)}">${escapeHtml(formatDisplayUrl(link.url))}</a>`,
    );
  }

  const experienceHtml = (data.experience || [])
    .map((item) =>
      renderResumeArticleHtml({
        title: item.role,
        date: item.date,
        org: formatCompanyForResume(item.company),
        location: item.location,
        bullets: item.bullets,
      }),
    )
    .join("");

  const projectsHtml = (data.projects || [])
    .map((item) => {
      const bulletsHtml = item.bullets?.length
        ? `<ul>${item.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
        : "";
      return `
        <article class="resume-item">
          <div class="item-header">
            <h3 class="item-title">${escapeHtml(item.name)}</h3>
          </div>
          ${item.role ? `<div class="item-subtitle">${escapeHtml(item.role)}</div>` : ""}
          ${bulletsHtml}
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
    .map((item) =>
      renderResumeArticleHtml({
        title: item.degree,
        date: item.date,
        major: item.major,
        org: item.school,
        location: item.location,
        bullets: item.bullets,
      }),
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
      margin: 0.6in;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      color: #111111;
      background: #ffffff;
      margin: 0;
      padding: 0.6in;
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
      margin: 0 0 3pt 0;
      letter-spacing: 0.2pt;
    }
    .headline {
      font-size: 10.5pt;
      font-weight: bold;
      margin: 0 0 4pt 0;
    }
    .contact-line {
      font-size: 9.5pt;
      color: #222222;
      margin: 0;
    }
    .contact-line a {
      color: #111111;
      text-decoration: none;
    }
    section {
      margin-bottom: 12pt;
    }
    h2 {
      font-size: 10.5pt;
      text-transform: uppercase;
      letter-spacing: 0.6pt;
      border-bottom: 1pt solid #333333;
      padding-bottom: 2pt;
      margin: 0 0 6pt 0;
    }
    .resume-item {
      margin-bottom: 8pt;
      break-inside: avoid;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12pt;
    }
    .item-title {
      font-size: 10pt;
      font-weight: bold;
      margin: 0;
    }
    .item-date {
      font-size: 9.5pt;
      white-space: nowrap;
    }
    .item-subtitle {
      font-size: 9.5pt;
      font-style: italic;
      margin: 1pt 0 3pt 0;
    }
    ul {
      margin: 2pt 0 0 0;
      padding-left: 16pt;
    }
    li {
      margin-bottom: 2.5pt;
    }
    .skill-row {
      margin: 0 0 3.5pt 0;
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
    ${experienceHtml ? `<section aria-labelledby="sec-exp"><h2 id="sec-exp">Work Experience</h2>${experienceHtml}</section>` : ""}
    ${projectsHtml ? `<section aria-labelledby="sec-projects"><h2 id="sec-projects">Selected Projects</h2>${projectsHtml}</section>` : ""}
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
  if (data.website) contactParts.push(formatDisplayUrl(data.website));
  for (const link of data.links || []) {
    contactParts.push(formatDisplayUrl(link.url));
  }
  if (contactParts.length) lines.push(contactParts.join(" | "));

  if (data.experience?.length) {
    lines.push("", "WORK EXPERIENCE", "===============");
    for (const item of data.experience) {
      lines.push(`${item.role}${item.date ? ` (${item.date})` : ""}`);
      const meta = [formatCompanyForResume(item.company), item.location]
        .filter(Boolean)
        .join(" | ");
      if (meta) lines.push(meta);
      for (const bullet of item.bullets || []) {
        lines.push(`- ${bullet}`);
      }
      lines.push("");
    }
  }

  if (data.projects?.length) {
    lines.push("SELECTED PROJECTS", "=================");
    for (const item of data.projects) {
      lines.push(`${item.name}${item.role ? ` - ${item.role}` : ""}`);
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

  return `${lines.join("\n").trim()}\n`;
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
let activeViewerCleanup = null;
let lastTriggerEl = null;
let escapeListenerAttached = false;

function closeResumeModal() {
  if (!activeModal) return;
  activeViewerCleanup?.();
  activeViewerCleanup = null;
  activeModal.remove();
  activeModal = null;
  if (activePdfUrl) {
    URL.revokeObjectURL(activePdfUrl);
    activePdfUrl = null;
  }
  document.documentElement?.classList?.remove("modal-open");
  if (lastTriggerEl && typeof lastTriggerEl.focus === "function") {
    lastTriggerEl.focus();
  }
  lastTriggerEl = null;
}

function yieldToPaint() {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Build the ATS-friendly PDF resume from the current portfolio DOM (excluding `#about`)
 * and display it in an accessible in-page preview modal with a manual Download Resume button.
 */
export async function requestResume(triggerEl = null, { githubRepos } = {}) {
  if (typeof document === "undefined") return null;

  const ownsLoading = Boolean(triggerEl && triggerEl.getAttribute?.("aria-busy") !== "true");
  if (ownsLoading) {
    setButtonLoading(triggerEl, true);
  }

  try {
    // Allow the browser to paint the loading spinner before PDF generation.
    await yieldToPaint();

    const resolvedGithubRepos =
      githubRepos !== undefined
        ? githubRepos
        : typeof window !== "undefined"
          ? await fetchLatestGithubProjects(3).catch(() => null)
          : null;

    const data = extractResumeData(document, { githubRepos: resolvedGithubRepos });
    const pdfBlob = buildAtsResumePdfBlob(data);
    const pdfUrl = URL.createObjectURL(pdfBlob);

    if (activeModal) {
      closeResumeModal();
    }

    activePdfUrl = pdfUrl;
    lastTriggerEl = triggerEl || document.activeElement;

    const modalTitle = t("contact.form.resumeModalTitle", { name: data.fullName });
    const safeTitle = escapeHtml(modalTitle);
    const safeFilename = escapeHtml(RESUME_PDF_FILENAME);
    const safeUrl = escapeHtml(pdfUrl);
    const safeDownloadLabel = escapeHtml(t("contact.form.downloadResume"));
    const safeCloseLabel = escapeHtml(t("contact.form.closeResumePreview"));

    const overlay = document.createElement("div");
    overlay.id = "resume-modal";
    overlay.className = PDF_MODAL_CLASSES.overlay;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "resume-modal-title");

    overlay.innerHTML = `
      <div class="${PDF_MODAL_CLASSES.dialog}">
        <div class="${PDF_MODAL_CLASSES.header}">
          <div>
            <h2 id="resume-modal-title" class="${PDF_MODAL_CLASSES.title}">${safeTitle}</h2>
          </div>
          <div class="${PDF_MODAL_CLASSES.controls}">
            <a class="${PDF_MODAL_CLASSES.downloadBtn}" href="${safeUrl}" download="${safeFilename}">${safeDownloadLabel}</a>
            <button type="button" class="${PDF_MODAL_CLASSES.closeBtn}" aria-label="${safeCloseLabel}">&times;</button>
          </div>
        </div>
        ${createPdfToolbarMarkup({ pdfUrl, allowPrint: true, allowOpenInTab: true })}
        <div class="${PDF_MODAL_CLASSES.frameWrap}"></div>
      </div>
    `;

    bindModalDismiss({
      modal: overlay,
      closeButton: overlay.querySelector(".resume-modal-close"),
      isOpen: () => Boolean(activeModal),
      onClose: closeResumeModal,
      attachEscape: !escapeListenerAttached,
    });
    escapeListenerAttached = true;

    document.body.appendChild(overlay);
    document.documentElement?.classList?.add("modal-open");
    activeModal = overlay;

    const wrap = overlay.querySelector(".resume-preview-frame-wrap");
    if (wrap) {
      activeViewerCleanup = mountPdfViewer({
        overlay,
        dialog: overlay.querySelector(".pdf-modal-dialog"),
        container: wrap,
        toolbar: overlay.querySelector(".pdf-viewer-toolbar"),
        pdfUrl,
        title: modalTitle,
        isOpen: () => Boolean(activeModal),
      });
    }

    overlay.querySelector(".resume-download-btn")?.focus();

    return { data, pdfUrl, filename: RESUME_PDF_FILENAME };
  } finally {
    if (ownsLoading) {
      setButtonLoading(triggerEl, false);
    }
  }
}
