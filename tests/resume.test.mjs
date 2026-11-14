import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RESUME_EMAIL,
  RESUME_FULL_NAME,
  RESUME_PHONE,
  RESUME_WEBSITE,
  buildAtsResumeHtml,
  buildAtsResumeText,
  escapeHtml,
  extractResumeData,
  normalizeText,
} from "../src/js/resume.js";
import {
  buildAtsResumePdfBytes,
  toPdfSafeText,
  wrapPdfText,
} from "../src/js/pdf-builder.js";

function createElement({
  textContent = "",
  attributes = {},
  dataset = {},
  childrenBySelector = {},
} = {}) {
  return {
    textContent,
    dataset,
    href: attributes.href || "",
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    querySelector(selector) {
      const list = childrenBySelector[selector];
      return list && list.length > 0 ? list[0] : null;
    },
    querySelectorAll(selector) {
      return childrenBySelector[selector] || [];
    },
  };
}

function createMockDocument() {
  const aboutSection = createElement({
    textContent: "SECRET_ABOUT_SECTION_TEXT",
  });

  const experienceSection = createElement({
    childrenBySelector: {
      ".experience-item": [
        createElement({
          childrenBySelector: {
            ".experience-role": [createElement({ textContent: "College Instructor" })],
            ".experience-date": [
              createElement({
                textContent: "July 2026 – Present · 5 mos",
                dataset: { dateRange: "July 2026 – Present" },
              }),
            ],
            ".experience-company": [
              createElement({ textContent: "University of Caloocan City · Full-time" }),
            ],
            ".experience-location": [
              createElement({ textContent: "Caloocan City, Metro Manila" }),
            ],
            ".experience-list li": [
              createElement({ textContent: "Teach game design theory and prototyping." }),
            ],
          },
        }),
      ],
    },
  });

  const projectsSection = createElement({
    childrenBySelector: {
      ".project-category": [
        createElement({
          childrenBySelector: {
            ".category-label": [createElement({ textContent: "Systems & Tools" })],
            ".project-card": [
              createElement({
                attributes: { href: "https://github.com/haruchanz64/GDriveDesktop" },
                childrenBySelector: {
                  ".project-title": [createElement({ textContent: "GDriveDesktop" })],
                  ".project-description": [
                    createElement({ textContent: "Desktop sync client." }),
                  ],
                  ".role-tag, .project-language": [
                    createElement({ textContent: "C#" }),
                  ],
                },
              }),
            ],
          },
        }),
      ],
    },
  });

  const skillsSection = createElement({
    childrenBySelector: {
      ".skill-tab": [
        createElement({
          textContent: "Programming Languages",
          attributes: { "data-skill": "languages" },
        }),
      ],
    },
  });

  const languagesPanel = createElement({
    childrenBySelector: {
      ".skill-name": [
        createElement({ textContent: "C#" }),
        createElement({ textContent: "Dart" }),
      ],
    },
  });

  const contactSection = createElement({
    childrenBySelector: {
      ".social-links a": [
        createElement({
          attributes: {
            "aria-label": "GitHub",
            href: "https://www.github.com/haruchanz64",
          },
        }),
        createElement({
          attributes: {
            "aria-label": "LinkedIn",
            href: "https://www.linkedin.com/in/aronjakeradam/",
          },
        }),
      ],
    },
  });

  const byId = {
    about: aboutSection,
    experience: experienceSection,
    projects: projectsSection,
    skills: skillsSection,
    languages: languagesPanel,
    contact: contactSection,
  };

  return {
    getElementById(id) {
      return byId[id] || null;
    },
    querySelector(selector) {
      if (selector === ".nav-brand-role") {
        return createElement({ textContent: "Software Engineer & College Instructor" });
      }
      return null;
    },
  };
}

describe("resume helpers", () => {
  it("normalizes whitespace and escapes HTML", () => {
    assert.equal(normalizeText("  hello \n  world  "), "hello world");
    assert.equal(escapeHtml('<script>"test"</script>'), "&lt;script&gt;&quot;test&quot;&lt;/script&gt;");
  });

  it("uses the full name Aron Jake S. Radam, phone, email, and website", () => {
    assert.equal(RESUME_FULL_NAME, "Aron Jake S. Radam");
    assert.equal(RESUME_PHONE, "(+63) 961 226 2083");
    assert.equal(RESUME_EMAIL, "radam.aronjake@gmail.com");
    assert.equal(RESUME_WEBSITE, "https://haruchanz64.github.io/");
  });
});

describe("extractResumeData", () => {
  it("extracts experience, projects, skills, and only LinkedIn/GitHub links while excluding #about", () => {
    const doc = createMockDocument();
    const data = extractResumeData(doc);

    assert.equal(data.fullName, "Aron Jake S. Radam");
    assert.equal(data.phone, "(+63) 961 226 2083");
    assert.equal(data.email, "radam.aronjake@gmail.com");
    assert.equal(data.headline, "Software Engineer & College Instructor");
    assert.equal(data.location, "Caloocan City, Metro Manila");
    assert.equal(data.experience.length, 1);
    assert.equal(data.experience[0].date, "July 2026 – Present");
    assert.equal(data.projects, undefined);
    assert.deepEqual(data.skills, [
      { category: "Programming Languages", items: ["C#", "Dart"] },
    ]);
    assert.deepEqual(
      data.links.map((l) => l.label),
      ["GitHub", "LinkedIn"],
    );
    assert.equal(JSON.stringify(data).includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });
});

describe("buildAtsResumeHtml and buildAtsResumeText", () => {
  it("builds ATS-friendly HTML without About or Projects content, images, or SVGs", () => {
    const data = extractResumeData(createMockDocument());
    const html = buildAtsResumeHtml(data);

    assert.ok(html.includes("<h1>Aron Jake S. Radam</h1>"));
    assert.ok(html.includes(">Experience<"));
    assert.ok(html.includes(">Technical Skills<"));
    assert.equal(html.includes(">Projects<"), false);
    assert.equal(html.includes("GDriveDesktop"), false);
    assert.equal(html.includes("SECRET_ABOUT_SECTION_TEXT"), false);
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("<svg"), false);
  });

  it("builds ATS-friendly plain text without About or Projects content", () => {
    const data = extractResumeData(createMockDocument());
    const text = buildAtsResumeText(data);

    assert.ok(text.startsWith("Aron Jake S. Radam\n"));
    assert.ok(text.includes("EXPERIENCE"));
    assert.ok(text.includes("TECHNICAL SKILLS"));
    assert.equal(text.includes("PROJECTS"), false);
    assert.ok(text.includes("Programming Languages: C#, Dart"));
    assert.equal(text.includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });
});

describe("buildAtsResumePdfBytes", () => {
  it("normalizes punctuation and wraps text", () => {
    assert.equal(toPdfSafeText("July 2026 – Present · 5 mos"), "July 2026 - Present | 5 mos");
    const wrapped = wrapPdfText("one two three four five six seven eight", 100, 10);
    assert.ok(wrapped.length > 1);
  });

  it("generates a valid PDF 1.4 document with full name and without About or Projects content", () => {
    const data = extractResumeData(createMockDocument());
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);

    assert.ok(bytes instanceof Uint8Array);
    assert.ok(pdfText.startsWith("%PDF-1.4\n"));
    assert.ok(pdfText.includes("xref\n"));
    assert.ok(pdfText.includes("startxref\n"));
    assert.ok(pdfText.endsWith("%%EOF\n"));
    assert.ok(pdfText.includes("(Aron Jake S. Radam) Tj"));
    assert.ok(pdfText.includes("(\\(+63\\) 961 226 2083) Tj"));
    assert.ok(pdfText.includes("(radam.aronjake@gmail.com) Tj"));
    assert.ok(pdfText.includes("(https://haruchanz64.github.io/) Tj"));
    assert.ok(pdfText.includes("/URI (https://haruchanz64.github.io/)"));
    assert.ok(pdfText.includes("(EXPERIENCE) Tj"));
    assert.ok(pdfText.includes("(TECHNICAL SKILLS) Tj"));
    assert.equal(pdfText.includes("(PROJECTS) Tj"), false);
    assert.equal(pdfText.includes("GDriveDesktop"), false);
    assert.ok(pdfText.includes("/URI (mailto:radam.aronjake@gmail.com)"));
    assert.ok(pdfText.includes("/BaseFont /ArialMT"));
    assert.ok(pdfText.includes("/MediaBox [0 0 595.28 841.89]"));
    assert.ok(pdfText.includes("/Title (Aron Jake S. Radam - Resume)"));
    assert.equal(pdfText.includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });

  it("justifies multi-line bullets with Tw word spacing", () => {
    const data = extractResumeData(createMockDocument());
    data.experience[0].bullets = [
      "Teach game design theory, prototyping, and production pipelines to sophomore through senior students, guiding projects from initial mechanics to full production.",
    ];
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    assert.ok(/\d+\.\d{3} Tw/.test(pdfText));
    assert.ok(pdfText.includes("0 Tw"));
  });

  it("encodes WinAnsi characters like ñ in Las Piñas", () => {
    const data = extractResumeData(createMockDocument());
    data.experience[0].location = "Las Piñas, Metro Manila";
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    assert.ok(pdfText.includes("(Las Pi\\361as, Metro Manila) Tj"));
  });

  it("paginates automatically when content exceeds one page", () => {
    const data = extractResumeData(createMockDocument());
    const manyBullets = Array.from({ length: 65 }, (_, i) => `Achievement number ${i + 1} with enough detail.`);
    data.experience[0].bullets = manyBullets;

    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    assert.ok(pdfText.includes("/Count 2"));
  });
});
