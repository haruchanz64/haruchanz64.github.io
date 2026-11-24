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
  RESUME_DEFAULT_LOCATION,
  RESUME_FULL_NAME,
  RESUME_WEBSITE,
  requestResume,
} from "../src/js/resume/resume.js";

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
            ".experience-location": [createElement({ textContent: "Caloocan City, Metro Manila" })],
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
                textContent: "BS in Entertainment and Multimedia Computing",
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
            ".experience-location": [createElement({ textContent: "Caloocan City, Metro Manila" })],
            ".experience-list li": [
              createElement({
                textContent:
                  "Capstone Project — Trash Frenzy: Educational game raising water pollution awareness.",
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

  it("uses full name, default location, and website without phone or email", () => {
    assert.equal(RESUME_FULL_NAME, "Aron Jake S. Radam");
    assert.equal(RESUME_DEFAULT_LOCATION, "Caloocan City, Metro Manila");
    assert.equal(RESUME_WEBSITE, "https://haruchanz64.github.io/");
  });

  it("formats display URLs and company employment qualifiers cleanly", () => {
    assert.equal(formatDisplayUrl("https://haruchanz64.github.io/"), "haruchanz64.github.io");
    assert.equal(formatDisplayUrl("https://www.github.com/haruchanz64"), "github.com/haruchanz64");
    assert.equal(
      formatCompanyForResume("University of Caloocan City · Full-time"),
      "University of Caloocan City",
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
  it("extracts experience, selected projects, skills, and LinkedIn/GitHub/itch.io links while excluding #about", () => {
    const doc = createMockDocument();
    const data = extractResumeData(doc);

    assert.equal(data.fullName, "Aron Jake S. Radam");
    assert.equal(data.phone, undefined);
    assert.equal(data.email, undefined);
    assert.equal(data.headline, "Game Developer · Systems, Tools & Technical Design");
    assert.equal(data.location, "Caloocan City, Metro Manila");
    assert.equal(data.experience.length, 1);
    assert.equal(data.experience[0].date, "July 2026 – Present");
    assert.equal(data.education.length, 1);
    assert.equal(data.education[0].degree, "BS in Entertainment and Multimedia Computing");
    assert.ok(Array.isArray(data.projects));
    assert.equal(data.projects.length, 4);
    const unityAuthIdx = data.projects.findIndex((p) => p.name.includes("UnityAuthCore"));
    const trashFrenzyIdx = data.projects.findIndex((p) => p.name.includes("Trash Frenzy"));
    assert.ok(unityAuthIdx !== -1);
    assert.ok(trashFrenzyIdx !== -1);
    assert.ok(unityAuthIdx < trashFrenzyIdx);
    assert.ok(data.projects.some((p) => p.name.includes("GachaEngine")));
    assert.ok(data.projects.some((p) => p.name.includes("AssetImportRules")));
    assert.deepEqual(data.skills, [
      { category: "Programming Languages", items: ["C#", "Dart"] },
      { category: "Spoken Languages", items: ["English (Fluent)", "Filipino (Native)"] },
    ]);
    assert.deepEqual(
      data.links.map((l) => l.label),
      ["GitHub", "itch.io", "LinkedIn"],
    );
    assert.equal(JSON.stringify(data).includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });
});

describe("buildAtsResumeHtml and buildAtsResumeText", () => {
  it("builds ATS-friendly HTML with Selected Projects and without About content, images, or SVGs", () => {
    const data = extractResumeData(createMockDocument());
    const html = buildAtsResumeHtml(data);

    assert.ok(html.includes("<h1>Aron Jake S. Radam</h1>"));
    assert.ok(html.includes(">Experience<"));
    assert.ok(html.includes(">Selected Projects<"));
    assert.ok(html.includes("UnityAuthCore"));
    assert.ok(html.includes("GachaEngine"));
    assert.ok(html.includes("AssetImportRules"));
    assert.ok(html.includes(">Technical Skills<"));
    assert.equal(html.includes("GDriveDesktop"), false);
    assert.equal(html.includes("SECRET_ABOUT_SECTION_TEXT"), false);
    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("<svg"), false);
  });

  it("builds ATS-friendly plain text with Selected Projects and without About content", () => {
    const data = extractResumeData(createMockDocument());
    const text = buildAtsResumeText(data);

    assert.ok(text.startsWith("Aron Jake S. Radam\n"));
    assert.ok(text.includes("EXPERIENCE"));
    assert.ok(text.includes("SELECTED PROJECTS"));
    assert.ok(text.includes("UnityAuthCore"));
    assert.ok(text.includes("GachaEngine"));
    assert.ok(text.includes("AssetImportRules"));
    assert.ok(text.includes("TECHNICAL SKILLS"));
    assert.ok(text.includes("Programming Languages: C#, Dart"));
    assert.ok(text.includes("Spoken Languages: English (Fluent), Filipino (Native)"));
    assert.ok(text.includes("- Capstone Project — Trash Frenzy:"));
    assert.equal(text.includes("SECRET_ABOUT_SECTION_TEXT"), false);
  });
});

describe("buildAtsResumePdfBytes", () => {
  it("normalizes punctuation and wraps text", () => {
    assert.equal(toPdfSafeText("July 2026 – Present · 5 mos"), "July 2026 - Present | 5 mos");
    const wrapped = wrapPdfText("one two three four five six seven eight", 100, 10);
    assert.ok(wrapped.length > 1);
  });

  it("generates a valid PDF 1.4 document with Standard 14 Helvetica fonts, Selected Projects, clickable links, and without About content", () => {
    const data = extractResumeData(createMockDocument());
    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);

    assert.ok(bytes instanceof Uint8Array);
    assert.ok(pdfText.startsWith("%PDF-1.4\n"));
    assert.ok(pdfText.includes("xref\n"));
    assert.ok(pdfText.includes("startxref\n"));
    assert.ok(pdfText.endsWith("%%EOF\n"));
    assert.ok(pdfText.includes("(Aron Jake S. Radam) Tj"));
    assert.ok(pdfText.includes("(Game Developer | Systems, Tools & Technical Design) Tj"));
    assert.ok(pdfText.includes("(Caloocan City, Metro Manila) Tj"));
    assert.ok(pdfText.includes("(haruchanz64.github.io) Tj"));
    assert.ok(pdfText.includes("/URI (https://haruchanz64.github.io/)"));
    assert.ok(pdfText.includes("/URI (https://haruchanz64.itch.io/)"));
    assert.ok(pdfText.includes("(EXPERIENCE) Tj"));
    assert.ok(pdfText.includes("(SELECTED PROJECTS) Tj"));
    assert.ok(pdfText.includes("(TECHNICAL SKILLS) Tj"));
    assert.ok(pdfText.includes("(EDUCATION) Tj"));
    assert.ok(pdfText.includes("Major in Game Development"));
    assert.ok(pdfText.includes("UnityAuthCore"));
    assert.ok(pdfText.includes("GachaEngine"));
    assert.ok(pdfText.includes("AssetImportRules"));
    assert.ok(pdfText.includes("Trash Frenzy"));
    assert.ok(pdfText.indexOf("UnityAuthCore") < pdfText.indexOf("Trash Frenzy"));
    assert.ok(pdfText.indexOf("(SELECTED PROJECTS) Tj") < pdfText.indexOf("(TECHNICAL SKILLS) Tj"));
    assert.ok(pdfText.indexOf("(TECHNICAL SKILLS) Tj") < pdfText.indexOf("(EDUCATION) Tj"));
    assert.equal(pdfText.includes("GDriveDesktop"), false);
    assert.ok(
      pdfText.includes("/BaseFont /Helvetica\n") || pdfText.includes("/BaseFont /Helvetica "),
    );
    assert.ok(pdfText.includes("/BaseFont /Helvetica-Bold"));
    assert.ok(pdfText.includes("/BaseFont /Helvetica-Oblique"));
    assert.equal(pdfText.includes("/ArialMT"), false);
    assert.ok(pdfText.includes("/MediaBox [0 0 595.28 841.89]"));
    assert.ok(pdfText.includes("/Title (Aron Jake S. Radam - Resume)"));
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

  it("fits the real portfolio resume content cleanly onto 1 A4 page", async () => {
    const en = JSON.parse(
      await readFile(new URL("../src/locales/en_us.json", import.meta.url), "utf8"),
    );
    const githubProjects = JSON.parse(
      await readFile(new URL("../public/data/github-projects.json", import.meta.url), "utf8"),
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
            "Unity 6 (UI Toolkit, URP, ScriptableObjects, UPM, Input System)",
            "Netcode (NGO, Mirror, FishNet)",
            "Flutter",
            "Spring Boot",
          ],
        },
        { category: "Programming Languages", items: ["C#", "Dart", "Java"] },
        {
          category: "Tools & Software",
          items: [
            "JetBrains Rider",
            "Visual Studio",
            "Git",
            "GitHub",
            "Figma",
            "Trello",
            "Docker",
            "QA & Regression Testing",
          ],
        },
        { category: "Databases", items: ["PostgreSQL", "Supabase", "MySQL"] },
        { category: "Spoken Languages", items: ["English (Fluent)", "Filipino (Native)"] },
      ],
    };

    const bytes = buildAtsResumePdfBytes(fullData);
    const pdfText = new TextDecoder().decode(bytes);
    assert.ok(pdfText.includes("/Count 1"), "Expected full portfolio resume to fit on 1 A4 page");
    assert.ok(pdfText.includes("PicStar Software OPC \\(Contract\\)"));
    assert.ok(pdfText.includes("GridLock-Games Studio \\(Internship\\)"));
    assert.ok(pdfText.includes("Programming Languages: "));
    assert.ok(pdfText.includes("Spoken Languages: "));
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
    const manyBullets = Array.from(
      { length: 65 },
      (_, i) => `Achievement number ${i + 1} with enough detail.`,
    );
    data.experience[0].bullets = manyBullets;

    const bytes = buildAtsResumePdfBytes(data);
    const pdfText = new TextDecoder().decode(bytes);
    assert.ok(pdfText.includes("/Count 2"));
  });
});

describe("extractResumeData i18n fallback", () => {
  it("always pulls English text from en.json when data-i18n attributes are present", () => {
    const headlineEl = createElement({
      textContent: "ソフトウェアエンジニア & 大学講師",
      attributes: { "data-i18n": "nav.brandRole" },
    });
    const experienceSection = createElement({
      childrenBySelector: {
        ".experience-item": [
          createElement({
            childrenBySelector: {
              ".experience-role": [
                createElement({
                  textContent: "大学講師",
                  attributes: { "data-i18n": "experience.items.0.role" },
                }),
              ],
              ".experience-date": [
                createElement({
                  textContent: "2026年7月 – 現在",
                  dataset: { dateRange: "July 2026 – Present" },
                }),
              ],
              ".experience-company": [
                createElement({
                  textContent: "University of Caloocan City · フルタイム",
                  attributes: { "data-i18n": "experience.items.0.company" },
                }),
              ],
              ".experience-location": [
                createElement({ textContent: "Caloocan City, Metro Manila" }),
              ],
              ".experience-list li": [
                createElement({
                  textContent: "日本語の箇条書き",
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
                  textContent: "ゲーム開発専攻",
                  attributes: { "data-i18n": "education.items.0.major" },
                }),
              ],
              ".experience-date": [
                createElement({
                  textContent: "2021年8月 – 2025年4月",
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
                  textContent: "卒業制作",
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
            textContent: "プログラミング言語",
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
    assert.equal(data.headline, "Game Developer · Systems, Tools & Technical Design");
    assert.equal(data.experience[0].role, "College Instructor");
    assert.equal(data.experience[0].company, "University of Caloocan City · Full-time");
    assert.match(data.experience[0].bullets[0], /^Teach game design theory/);
    assert.equal(data.education[0].major, "Major in Game Development");
    assert.equal(data.education[0].date, "August 2021 – April 2025");
    assert.match(data.education[0].bullets[0], /^Coursework:/);
    assert.equal(data.skills[0].category, "Programming Languages");
    assert.equal(data.skills[1].category, "Spoken Languages");
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
