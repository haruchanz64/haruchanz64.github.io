import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  formatReleaseDate,
  REPO_RELEASE_DATES,
  selectLatestGithubRepos,
} from "../src/js/projects/github-config.js";
import {
  buildResumeSelectedProjects,
  getItchSlug,
  RESUME_SELECTED_PROJECTS,
  resolveGameDetails,
  resolveToolDetails,
} from "../src/js/projects/project-details.js";

describe("project breakdown metadata", () => {
  it("extracts itch.io slugs cleanly", () => {
    assert.equal(getItchSlug("https://haruchanz64.itch.io/trashfrenzy"), "trashfrenzy");
    assert.equal(getItchSlug("https://haruchanz64.itch.io/orders-please/"), "orders-please");
    assert.equal(getItchSlug("not-a-url"), "");
  });

  it("provides curated breakdown details for every synced itch.io game", async () => {
    const games = JSON.parse(
      await readFile(new URL("../src/data/itch-projects.json", import.meta.url), "utf8"),
    );

    for (const game of games) {
      const details = resolveGameDetails(game);
      assert.equal(details.kind, "game");
      assert.equal(details.title, game.title);
      assert.ok(details.role.length > 0);
      assert.ok(details.engine.includes("Unity"));
      assert.ok(details.highlights.length >= 3, `Expected highlights for ${game.title}`);
      assert.ok(details.stack.length >= 3, `Expected stack tags for ${game.title}`);
    }

    const trashFrenzy = resolveGameDetails(games[0]);
    assert.equal(trashFrenzy.caseStudyUrl, "/docs/trash-frenzy-case-study.pdf");
  });

  it("provides curated breakdown details, release dates, categories, and card tags for every synced Unity GitHub tool", async () => {
    const tools = JSON.parse(
      await readFile(new URL("../src/data/github-projects.json", import.meta.url), "utf8"),
    );

    assert.equal(tools[0].name, "UtilityAIEngine");
    assert.equal(tools[1].name, "MelodyRecognitionEngine");
    assert.equal(tools[2].name, "GachaEngine");

    for (const repo of tools) {
      const details = resolveToolDetails(repo);
      assert.equal(details.kind, "tool");
      assert.equal(details.title, repo.name);
      assert.ok(details.category.length > 0, `Expected category for ${repo.name}`);
      assert.ok(
        /^\d{4}-\d{2}-\d{2}$/.test(details.releasedAt),
        `Expected YYYY-MM-DD releasedAt for ${repo.name}`,
      );
      assert.ok(details.cardDescription.length > 0, `Expected cardDescription for ${repo.name}`);
      assert.ok(details.cardTags.length >= 2, `Expected cardTags for ${repo.name}`);
      assert.ok(details.role.length > 0);
      assert.ok(details.focus.length > 0);
      assert.ok(details.highlights.length >= 3, `Expected highlights for ${repo.name}`);
      assert.ok(details.stack.length >= 3, `Expected stack tags for ${repo.name}`);
    }
  });

  it("formats release dates cleanly for project cards and modals", () => {
    assert.equal(formatReleaseDate("2026-11-22"), "Nov 2026");
    assert.equal(formatReleaseDate("2025-05-21"), "May 2025");
    assert.equal(formatReleaseDate("2026-10-09"), "Oct 2026");
    assert.equal(formatReleaseDate(""), "");
    assert.equal(Object.keys(REPO_RELEASE_DATES).length, 17);
  });

  it("exposes clear, non-abbreviated Selected Projects entries for the ATS resume without project URLs", () => {
    assert.equal(RESUME_SELECTED_PROJECTS.length, 4);
    for (const item of RESUME_SELECTED_PROJECTS) {
      assert.ok(item.name.length > 0);
      assert.equal(item.name.includes("·"), false);
      assert.ok(item.role.length > 0);
      assert.equal(item.role.includes("PM,"), false);
      assert.equal(item.url, undefined);
      assert.ok(item.bullets.length >= 2);
    }
  });

  it("selects the latest 3 non-fork, non-meta GitHub repos and supports brand-new repos on the resume", () => {
    const selected = selectLatestGithubRepos(
      [
        {
          name: "haruchanz64.github.io",
          html_url: "https://github.com/haruchanz64/haruchanz64.github.io",
          created_at: "2026-11-20T00:00:00Z",
        },
        {
          name: "haruchanz64",
          html_url: "https://github.com/haruchanz64/haruchanz64",
          created_at: "2026-11-19T00:00:00Z",
        },
        {
          name: "ForkedRepo",
          html_url: "https://github.com/haruchanz64/ForkedRepo",
          fork: true,
          created_at: "2026-11-18T00:00:00Z",
        },
        {
          name: "OldRepo",
          html_url: "https://github.com/haruchanz64/OldRepo",
          description: "Older project",
          language: "C#",
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          name: "FreshUnityTool",
          html_url: "https://github.com/haruchanz64/FreshUnityTool",
          description: "Brand-new procedural dungeon editor tool.",
          language: "C#",
          created_at: "2026-11-15T00:00:00Z",
        },
        {
          name: "CharacterMotor",
          html_url: "https://github.com/haruchanz64/CharacterMotor",
          description: "Fallback desc",
          language: "C#",
          created_at: "2026-11-10T00:00:00Z",
        },
        {
          name: "GameBalancer",
          html_url: "https://github.com/haruchanz64/GameBalancer",
          description: "Fallback desc",
          language: "C#",
          created_at: "2026-11-05T00:00:00Z",
        },
      ],
      3,
    );

    assert.deepEqual(
      selected.map((r) => r.name),
      ["FreshUnityTool", "GameBalancer", "CharacterMotor"],
    );

    const resumeProjects = buildResumeSelectedProjects(selected);
    assert.equal(resumeProjects.length, 4);
    assert.equal(resumeProjects[0].name, "FreshUnityTool (C#)");
    assert.equal(resumeProjects[0].bullets[0], "Brand-new procedural dungeon editor tool.");
    assert.ok(resumeProjects[1].name.includes("GameBalancer"));
    assert.ok(resumeProjects[2].name.includes("CharacterMotor"));
    assert.ok(resumeProjects[3].name.includes("Trash Frenzy"));
  });
});
