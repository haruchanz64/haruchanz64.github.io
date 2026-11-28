import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  buildAtsResumePdfBytes,
  formatCompanyForResume,
  formatDisplayUrl,
  toPdfSafeText,
  wrapPdfText,
} from "../src/js/resume/pdf-builder.js";
import {
  buildAtsResumeHtml,
  buildAtsResumeText,
  escapeHtml,
  extractResumeData,
  isResumeRequestAllowed,
  MIN_RESUME_PAGE_TIME_MS,
  normalizeText,
  RESUME_COOLDOWN_MS,
  RESUME_DEFAULT_HEADLINE,
  RESUME_DEFAULT_LOCATION,
  RESUME_FULL_NAME,
  RESUME_WEBSITE,
  requestResume,
} from "../src/js/resume/resume.js";
import {
  clampZoom,
  createPdfIframeMarkup,
  createPdfToolbarMarkup,
  formatZoomPercent,
  PDF_ZOOM_MAX,
  PDF_ZOOM_MIN,
} from "../src/js/ui/pdf-preview.js";

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
      return Object.hasOwn(attributes, name) ? attributes[name] : null;
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
              createElement({ textContent: "Caloocan City, Metro Manila, Philippines" }),
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
                  ".project-description": [createElement({ textContent: "Desktop sync client." })],
                  ".role-tag, .project-language": [createElement({ textContent: "C#" })],
                },
              }),
            ],
          },
        }),
      ],
    },
  });

  const educationSection = createElement({
    childrenBySelector: {
      ".experience-item": [
        createElement({
          childrenBySelector: {
            ".experience-role": [
              createElement({
                textContent: "Bachelor of Science in Entertainment and Multimedia Computing",
              }),
            ],
            ".experience-major": [
              createElement({
                textContent: "Major in Game Development",
              }),
            ],
            ".experience-date": [
              createElement({
                textContent: "August 2021 – April 2025",
                dataset: { dateRange: "August 2021 – April 2025" },
              }),
            ],
            ".experience-company": [createElement({ textContent: "University of Caloocan City" })],
            ".experience-location": [
              createElement({ textContent: "Caloocan City, Metro Manila, Philippines" }),
            ],
            ".experience-list li": [
              createElement({
                textContent:
                  "Relevant Coursework: Game Design and Development, Advanced Game Design, and Game Production.",
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
      ".skill-name": [createElement({ textContent: "C#" }), createElement({ textContent: "Dart" })],
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
            "aria-label": "itch.io",
            href: "https://haruchanz64.itch.io/",
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
    education: educationSection,
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
        return createElement({ textContent: "Game Developer · Systems, Tools & Technical Design" });
      }
      return null;
    },
  };
}

describe("resume helpers", () => {
  it("normalizes whitespace and escapes HTML", () => {
    assert.equal(normalizeText("  hello \n  world  "), "hello world");
    assert.equal(
      escapeHtml('<script>"test"</script>'),
      "&lt;script&gt;&quot;test&quot;&lt;/script&gt;",
    );
  });

  it("uses full name, default international location, and website without phone or email", () => {
    assert.equal(RESUME_FULL_NAME, "Aron Jake S. Radam");
    assert.equal(RESUME_DEFAULT_LOCATION, "Caloocan City, Metro Manila, Philippines");
    assert.equal(RESUME_WEBSITE, "https://haruchanz64.github.io/");
  });

  it("formats display URLs and company employment qualifiers cleanly", () => {
    assert.equal(formatDisplayUrl("https://haruchanz64.github.io/"), "haruchanz64.github.io");
    assert.equal(formatDisplayUrl("https://www.github.com/haruchanz64"), "github.com/haruchanz64");
    assert.equal(
      formatCompanyForResume("University of Caloocan City · Full-time"),
      "University of Caloocan City (Full-time)",
    );
    assert.equal(
      formatCompanyForResume("PicStar Software OPC · Contract"),
      "PicStar Software OPC (Contract)",
    );
    assert.equal(
      formatCompanyForResume("GridLock-Games Studio · Internship"),
      "GridLock-Games Studio (Internship)",
    );
  });

  it("gates resume requests against untrusted, rushed, or rapid-repeat triggers", () => {
    const ok = {
      isTrusted: true,
      elapsedMs: MIN_RESUME_PAGE_TIME_MS + 500,
      hasInteracted: true,
      lastTriggeredAt: 0,
      now: 10_000,
    };
    assert.equal(isResumeRequestAllowed(ok), true);
    assert.equal(isResumeRequestAllowed({ ...ok, isTrusted: false }), false);
    assert.equal(isResumeRequestAllowed({ ...ok, hasInteracted: false }), false);
    assert.equal(isResumeRequestAllowed({ ...ok, elapsedMs: MIN_RESUME_PAGE_TIME_MS - 1 }), false);
    assert.equal(
      isResumeRequestAllowed({
        ...ok,
        lastTriggeredAt: 10_000 - (RESUME_COOLDOWN_MS - 100),
      }),
      false,
    );
  });
});

describe("extractResumeData", () => {
  it("extracts experience, selected projects, flat ATS skills, and ordered profile links while excluding #about", () => {
    const doc = createMockDocument();
    const data = extractResumeData(doc);

    assert.equal(data.fullName, "Aron Jake S. Radam");
    assert.equal(data.phone, undefined);
    assert.equal(data.email, undefined);
    assert.equal(data.summary, undefined);
    assert.equal(data.headline, RESUME_DEFAULT_HEADLINE);
    assert.equal(data.location, "Caloocan City, Metro Manila, Philippines");
    assert.equal(data.experience.length, 1);
    assert.equal(data.experience[0].date, "July 2026 – Present");
    assert.equal(data.education.length, 1);
    assert.equal(
      data.education[0].degree,
      "Bachelor of Science in Entertainment and Multimedia Computing",
    );
    assert.ok(Array.isArray(data.projects));
    assert.equal(data.projects.length, 4);
    const devQaIdx = data.projects.findIndex((p) => p.name.includes("DevQAToolkit"));
    const trashFrenzyIdx = data.projects.findIndex((p) => p.name.includes("Trash Frenzy"));
    assert.ok(devQaIdx !== -1);
    assert.ok(trashFrenzyIdx !== -1);
    assert.ok(devQaIdx < trashFrenzyIdx);
    assert.ok(data.projects.some((p) => p.name.includes("NetQAToolkit")));
    assert.ok(data.projects.some((p) => p.name.includes("ScriptableDataToolkit")));
    assert.equal(
      data.projects[trashFrenzyIdx].role,
      "Project Manager, Game Designer, Gameplay Programmer, and Quality Assurance",
    );
    assert.equal(data.skills[0].category, "Programming Languages");
    assert.deepEqual(data.skills[0].items, ["C#", "Dart"]);
    assert.equal(data.skills[1].category, "Game Development & Quality Assurance");
    assert.ok(data.skills[1].items.includes("Quality Assurance (QA)"));
    assert.deepEqual(data.skills[2], {
      category: "Spoken Languages",
      items: ["English (Fluent)", "Filipino (Native)"],
    });
    assert.deepEqual(
      data.links.map((l) => l.label),
      ["LinkedIn", "GitHub", "itch.io"],
    );
    assert.equal(JSON.stringify(data).includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });
});

describe("buildAtsResumeHtml and buildAtsResumeText", () => {
  it("builds ATS-friendly HTML with Work Experience and Selected Projects without Professional Summary, About content, images, or SVGs", () => {
    const data = extractResumeData(createMockDocument());
    const html = buildAtsResumeHtml(data);

    assert.ok(html.includes("<h1>Aron Jake S. Radam</h1>"));
    assert.equal(html.includes("Professional Summary"), false);
    assert.ok(html.includes(">Work Experience<"));
    assert.ok(html.includes(">Selected Projects<"));
    assert.ok(html.includes("DevQAToolkit"));
    assert.ok(html.includes("NetQAToolkit"));
    assert.ok(html.includes("ScriptableDataToolkit"));
    assert.ok(html.includes(">Technical Skills<"));
    assert.ok(html.includes("Caloocan City, Metro Manila, Philippines"));
    assert.equal(html.includes("GDriveDesktop"), false);
    assert.equal(html.includes("github.com/haruchanz64/DevQAToolkit"), false);
    assert.equal(html.includes("haruchanz64.itch.io/trashfrenzy"), false);
    assert.equal(html.includes("SECRET_ABOUT_SECTION_TEXT"), false);
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("<svg"), false);
  });

  it("builds ATS-friendly plain text with expanded terms without Professional Summary or About content", () => {
    const data = extractResumeData(createMockDocument());
    const text = buildAtsResumeText(data);

    assert.ok(text.startsWith("Aron Jake S. Radam\n"));
    assert.equal(text.includes("PROFESSIONAL SUMMARY"), false);
    assert.ok(text.includes("WORK EXPERIENCE"));
    assert.ok(text.includes("SELECTED PROJECTS"));
    assert.ok(text.includes("DevQAToolkit"));
    assert.ok(text.includes("NetQAToolkit"));
    assert.ok(text.includes("ScriptableDataToolkit"));
    assert.ok(text.includes("TECHNICAL SKILLS"));
    assert.ok(text.includes("Programming Languages: C#, Dart"));
    assert.ok(text.includes("Game Development & Quality Assurance:"));
    assert.ok(text.includes("Spoken Languages: English (Fluent), Filipino (Native)"));
    assert.ok(text.includes("Bachelor of Science in Entertainment and Multimedia Computing"));
    assert.ok(text.includes("- Relevant Coursework:"));
    assert.equal(text.includes("—"), false);
    assert.equal(text.includes("github.com/haruchanz64/DevQAToolkit"), false);
    assert.equal(text.includes("haruchanz64.itch.io/trashfrenzy"), false);
    assert.equal(text.includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });
});

describe("buildAtsResumePdfBytes", () => {
  it("normalizes punctuation and wraps text", () => {
    assert.equal(toPdfSafeText("July 2026 – Present · 5 mos"), "July 2026 - Present | 5 mos");
    const wrapped = wrapPdfText("one two three four five six seven eight", 100, 10);
    assert.ok(wrapped.length > 1);
  });

  it("generates a valid PDF 1.4 document with Standard 14 Helvetica fonts, Selected Projects, clickable links, metadata, and without Professional Summary or About content", () => {
    const data = extractResumeData(createMockDocument());
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);

    assert.ok(bytes instanceof Uint8Array);
    assert.ok(pdfText.startsWith("%PDF-1.4\n"));
    assert.ok(pdfText.includes("xref\n"));
    assert.ok(pdfText.includes("startxref\n"));
    assert.ok(pdfText.endsWith("%%EOF\n"));
    assert.ok(pdfText.includes("(Aron Jake S. Radam) Tj"));
    assert.ok(
      pdfText.includes(
        "(Game Developer | Gameplay Systems, Unity Tooling, and Technical Game Design) Tj",
      ),
    );
    assert.ok(pdfText.includes("(Caloocan City, Metro Manila, Philippines) Tj"));
    assert.ok(pdfText.includes("(haruchanz64.github.io) Tj"));
    assert.ok(pdfText.includes("/URI (https://haruchanz64.github.io/)"));
    assert.ok(pdfText.includes("/URI (https://haruchanz64.itch.io/)"));
    assert.equal(pdfText.includes("(PROFESSIONAL SUMMARY) Tj"), false);
    assert.ok(pdfText.includes("(WORK EXPERIENCE) Tj"));
    assert.ok(pdfText.includes("(SELECTED PROJECTS) Tj"));
    assert.ok(pdfText.includes("(TECHNICAL SKILLS) Tj"));
    assert.ok(pdfText.includes("(EDUCATION) Tj"));
    assert.ok(pdfText.includes("Bachelor of Science in Entertainment and Multimedia Computing"));
    assert.ok(pdfText.includes("Major in Game Development"));
    assert.ok(pdfText.includes("DevQAToolkit"));
    assert.ok(pdfText.includes("NetQAToolkit"));
    assert.ok(pdfText.includes("ScriptableDataToolkit"));
    assert.ok(pdfText.includes("Trash Frenzy"));
    assert.ok(pdfText.indexOf("(WORK EXPERIENCE) Tj") < pdfText.indexOf("(SELECTED PROJECTS) Tj"));
    assert.ok(pdfText.indexOf("DevQAToolkit") < pdfText.indexOf("Trash Frenzy"));
    assert.ok(pdfText.indexOf("(SELECTED PROJECTS) Tj") < pdfText.indexOf("(TECHNICAL SKILLS) Tj"));
    assert.ok(pdfText.indexOf("(TECHNICAL SKILLS) Tj") < pdfText.indexOf("(EDUCATION) Tj"));
    assert.equal(pdfText.includes("GDriveDesktop"), false);
    assert.equal(pdfText.includes("github.com/haruchanz64/DevQAToolkit"), false);
    assert.equal(pdfText.includes("haruchanz64.itch.io/trashfrenzy"), false);
    assert.ok(
      pdfText.includes("/BaseFont /Helvetica\n") || pdfText.includes("/BaseFont /Helvetica "),
    );
    assert.ok(pdfText.includes("/BaseFont /Helvetica-Bold"));
    assert.ok(pdfText.includes("/BaseFont /Helvetica-Oblique"));
    assert.equal(pdfText.includes("/ArialMT"), false);
    assert.ok(pdfText.includes("/MediaBox [0 0 595.28 841.89]"));
    assert.ok(pdfText.includes("/Title (Aron Jake S. Radam - Resume)"));
    assert.ok(pdfText.includes("/Subject (Game Developer | Gameplay Systems"));
    assert.ok(pdfText.includes("/Keywords ("));
    assert.equal(pdfText.includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });

  it("keeps multi-line bullets left-aligned without Tw justification distortion", () => {
    const data = extractResumeData(createMockDocument());
    data.experience[0].bullets = [
      "Teach game design theory, prototyping, and production pipelines to sophomore through senior students, guiding projects from initial mechanics to full production.",
    ];
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    assert.equal(/\d+\.\d{3} Tw/.test(pdfText), false);
  });

  it("renders the full real portfolio resume cleanly across 1 to 2 A4 pages with expanded PH and international text", async () => {
    const en = JSON.parse(
      await readFile(new URL("../src/locales/en_us.json", import.meta.url), "utf8"),
    );
    const githubProjects = JSON.parse(
      await readFile(new URL("../src/data/github-projects.json", import.meta.url), "utf8"),
    );

    const experience = Object.values(en.experience.items).map((item) => ({
      role: item.role,
      date: item.date,
      company: item.company,
      location: item.location,
      bullets: Object.keys(item)
        .filter((k) => /^b\d+$/.test(k))
        .sort()
        .map((k) => item[k]),
    }));

    const education = Object.values(en.education.items).map((item) => ({
      degree: item.degree,
      major: item.major,
      date: item.date,
      school: item.school,
      location: item.location,
      bullets: Object.keys(item)
        .filter((k) => /^b\d+$/.test(k))
        .sort()
        .map((k) => item[k]),
    }));

    const doc = createMockDocument();
    const extracted = extractResumeData(doc, { githubRepos: githubProjects });
    const fullData = {
      ...extracted,
      experience,
      education,
      skills: [
        {
          category: "Engines & Frameworks",
          items: [
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
            "Flutter",
          ],
        },
        { category: "Programming Languages", items: ["C#", "Dart"] },
        {
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
        },
        {
          category: "Tools & Software",
          items: ["JetBrains Rider", "Visual Studio", "Git", "GitHub", "Figma", "Trello", "Docker"],
        },
        { category: "Databases", items: ["PostgreSQL", "Supabase", "MySQL"] },
        { category: "Spoken Languages", items: ["English (Fluent)", "Filipino (Native)"] },
      ],
    };

    const bytes = buildAtsResumePdfBytes(fullData);
    const pdfText = new TextDecoder().decode(bytes);
    const pageCountMatch = /\/Count (\d+)/.exec(pdfText);
    const pageCount = Number(pageCountMatch?.[1] || 0);
    assert.ok(
      pageCount >= 1 && pageCount <= 2,
      `Expected full portfolio resume to fit cleanly in 1-2 A4 pages, got ${pageCount}`,
    );
    assert.ok(pdfText.includes("University of Caloocan City \\(Full-time\\)"));
    assert.ok(pdfText.includes("PicStar Software OPC \\(Contract\\)"));
    assert.ok(pdfText.includes("GridLock-Games Studio \\(Internship\\)"));
    assert.ok(pdfText.includes("Caloocan City, Metro Manila, Philippines"));
    assert.ok(pdfText.includes("Bachelor of Science in Entertainment and Multimedia Computing"));
    assert.ok(pdfText.includes("Programming Languages: "));
    assert.ok(pdfText.includes("Game Development & Quality Assurance: "));
    assert.ok(pdfText.includes("Spoken Languages: "));
  });

  it("encodes WinAnsi characters like ñ in Las Piñas", () => {
    const data = extractResumeData(createMockDocument());
    data.experience[0].location = "Las Piñas, Metro Manila, Philippines";
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    assert.ok(pdfText.includes("(Las Pi\\361as, Metro Manila, Philippines) Tj"));
  });

  it("paginates automatically when content exceeds one page", () => {
    const data = extractResumeData(createMockDocument());
    const manyBullets = Array.from(
      { length: 65 },
      (_, i) => `Achievement number ${i + 1} with enough detail.`,
    );
    data.experience[0].bullets = manyBullets;

    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    const countMatch = /\/Count (\d+)/.exec(pdfText);
    assert.ok(Number(countMatch?.[1] || 0) >= 2);
  });
});

describe("extractResumeData i18n fallback", () => {
  it("always pulls English text from en.json when data-i18n attributes are present", () => {
    const headlineEl = createElement({
      textContent: "Game Developer · Mga Sistema at Tool",
      attributes: { "data-i18n": "nav.brandRole" },
    });
    const experienceSection = createElement({
      childrenBySelector: {
        ".experience-item": [
          createElement({
            childrenBySelector: {
              ".experience-role": [
                createElement({
                  textContent: "Tagapagturo sa Kolehiyo",
                  attributes: { "data-i18n": "experience.items.0.role" },
                }),
              ],
              ".experience-date": [
                createElement({
                  textContent: "Hulyo 2026 – Kasalukuyan",
                  dataset: { dateRange: "July 2026 – Present" },
                }),
              ],
              ".experience-company": [
                createElement({
                  textContent: "University of Caloocan City · Full-time",
                  attributes: { "data-i18n": "experience.items.0.company" },
                }),
              ],
              ".experience-location": [
                createElement({ textContent: "Caloocan City, Metro Manila" }),
              ],
              ".experience-list li": [
                createElement({
                  textContent: "Nagtuturo ng game design theory sa Filipino",
                  attributes: { "data-i18n": "experience.items.0.b0" },
                }),
              ],
            },
          }),
        ],
      },
    });
    const educationSection = createElement({
      childrenBySelector: {
        ".experience-item": [
          createElement({
            childrenBySelector: {
              ".experience-role": [
                createElement({ textContent: "BS in Entertainment and Multimedia Computing" }),
              ],
              ".experience-major": [
                createElement({
                  textContent: "Major sa Game Development",
                  attributes: { "data-i18n": "education.items.0.major" },
                }),
              ],
              ".experience-date": [
                createElement({
                  textContent: "Agosto 2021 – Abril 2025",
                  attributes: { "data-i18n": "education.items.0.date" },
                }),
              ],
              ".experience-company": [
                createElement({ textContent: "University of Caloocan City" }),
              ],
              ".experience-location": [
                createElement({ textContent: "Caloocan City, Metro Manila" }),
              ],
              ".experience-list li": [
                createElement({
                  textContent: "Mga Kaugnay na Kurso",
                  attributes: { "data-i18n": "education.items.0.b0" },
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
            textContent: "Mga Wika",
            attributes: { "data-i18n": "skills.tabs.languages", "data-skill": "languages" },
          }),
        ],
      },
    });
    const languagesPanel = createElement({
      childrenBySelector: {
        ".skill-name": [createElement({ textContent: "C#" })],
      },
    });

    const doc = {
      querySelector(selector) {
        if (selector === ".nav-brand-role") return headlineEl;
        return null;
      },
      getElementById(id) {
        if (id === "experience") return experienceSection;
        if (id === "education") return educationSection;
        if (id === "skills") return skillsSection;
        if (id === "languages") return languagesPanel;
        return null;
      },
    };

    const data = extractResumeData(doc);
    assert.equal(data.headline, RESUME_DEFAULT_HEADLINE);
    assert.equal(data.experience[0].role, "College Instructor");
    assert.equal(data.experience[0].company, "University of Caloocan City · Full-time");
    assert.match(data.experience[0].bullets[0], /^Teach game design theory/);
    assert.equal(data.education[0].major, "Major in Game Development");
    assert.equal(data.education[0].date, "August 2021 – April 2025");
    assert.match(data.education[0].bullets[0], /^Relevant Coursework:/);
    assert.equal(data.skills[0].category, "Programming Languages");
    assert.equal(data.skills[1].category, "Game Development & Quality Assurance");
    assert.equal(data.skills[2].category, "Spoken Languages");
  });
});

describe("requestResume async loading", () => {
  it("toggles loading state asynchronously on the trigger button while generating", async () => {
    const prevDocument = globalThis.document;
    const prevCreateObjectURL = URL.createObjectURL;
    const prevRevokeObjectURL = URL.revokeObjectURL;

    const btnText = { style: { display: "inline" } };
    const btnSpinner = { style: { display: "none" } };
    const attrs = new Map();
    const triggerEl = {
      disabled: false,
      setAttribute(name, value) {
        attrs.set(name, value);
      },
      getAttribute(name) {
        return attrs.get(name) ?? null;
      },
      querySelector(selector) {
        if (selector === ".btn-text") return btnText;
        if (selector === ".btn-spinner") return btnSpinner;
        return null;
      },
    };

    const appended = [];
    const baseDoc = createMockDocument();
    const downloadBtn = { focus() {} };
    const closeBtn = { addEventListener() {} };
    const modalStub = {
      id: "",
      className: "",
      innerHTML: "",
      setAttribute() {},
      addEventListener() {},
      remove() {},
      querySelector(selector) {
        if (selector === ".resume-modal-close") return closeBtn;
        if (selector === ".resume-download-btn") return downloadBtn;
        return null;
      },
    };

    globalThis.document = {
      ...baseDoc,
      activeElement: null,
      body: {
        style: { overflow: "" },
        appendChild(el) {
          appended.push(el);
        },
      },
      createElement() {
        return modalStub;
      },
      addEventListener() {},
    };
    URL.createObjectURL = () => "blob:mock-resume";
    URL.revokeObjectURL = () => {};

    try {
      const pending = requestResume(triggerEl);

      // Immediately after calling, trigger should be in loading state before async yield completes.
      assert.equal(triggerEl.disabled, true);
      assert.equal(triggerEl.getAttribute("aria-busy"), "true");
      assert.equal(btnText.style.display, "none");
      assert.equal(btnSpinner.style.display, "inline");

      const result = await pending;
      assert.equal(result.pdfUrl, "blob:mock-resume");
      assert.equal(appended.length, 1);
      assert.ok(modalStub.innerHTML.includes('role="toolbar"'));
      assert.ok(modalStub.innerHTML.includes('data-pdf-action="zoom-in"'));
      assert.ok(modalStub.innerHTML.includes('data-pdf-action="zoom-out"'));
      assert.ok(modalStub.innerHTML.includes('data-pdf-action="fit-width"'));
      assert.ok(modalStub.innerHTML.includes('data-pdf-action="fullscreen"'));
      assert.ok(modalStub.innerHTML.includes('data-pdf-action="print"'));
      assert.ok(modalStub.innerHTML.includes('data-pdf-action="open-tab"'));

      // After resolution, loading state is restored.
      assert.equal(triggerEl.disabled, false);
      assert.equal(triggerEl.getAttribute("aria-busy"), "false");
      assert.equal(btnText.style.display, "inline");
      assert.equal(btnSpinner.style.display, "none");
    } finally {
      globalThis.document = prevDocument;
      URL.createObjectURL = prevCreateObjectURL;
      URL.revokeObjectURL = prevRevokeObjectURL;
    }
  });
});

describe("pdf preview viewer controls", () => {
  it("clamps zoom values and formats zoom percentages", () => {
    assert.equal(clampZoom(0.1), PDF_ZOOM_MIN);
    assert.equal(clampZoom(9), PDF_ZOOM_MAX);
    assert.equal(clampZoom(1.25), 1.25);
    assert.equal(clampZoom(Number.NaN), 1);
    assert.equal(formatZoomPercent(1), "100%");
    assert.equal(formatZoomPercent(1.75), "175%");
  });

  it("renders accessible toolbar controls and respects optional print/open-in-tab flags", () => {
    const resumeBar = createPdfToolbarMarkup({
      pdfUrl: "blob:resume",
      allowPrint: true,
      allowOpenInTab: true,
    });
    assert.ok(resumeBar.includes('role="toolbar"'));
    assert.ok(resumeBar.includes('data-pdf-action="prev-page"'));
    assert.ok(resumeBar.includes('data-pdf-action="next-page"'));
    assert.ok(resumeBar.includes('data-pdf-action="zoom-out"'));
    assert.ok(resumeBar.includes('data-pdf-action="zoom-in"'));
    assert.ok(resumeBar.includes('data-pdf-action="fit-width"'));
    assert.ok(resumeBar.includes('data-pdf-action="fullscreen"'));
    assert.ok(resumeBar.includes('data-pdf-action="print"'));
    assert.ok(resumeBar.includes('data-pdf-action="open-tab"'));

    const caseStudyBar = createPdfToolbarMarkup({
      pdfUrl: "/docs/trash-frenzy-case-study.pdf",
      allowPrint: false,
      allowOpenInTab: false,
    });
    assert.ok(caseStudyBar.includes('data-pdf-action="fullscreen"'));
    assert.ok(caseStudyBar.includes('data-pdf-action="zoom-in"'));
    assert.equal(caseStudyBar.includes('data-pdf-action="print"'), false);
    assert.equal(caseStudyBar.includes('data-pdf-action="open-tab"'), false);

    const iframeMarkup = createPdfIframeMarkup("/docs/test.pdf", "Test PDF");
    assert.ok(iframeMarkup.includes("#toolbar=1"));
  });
});
