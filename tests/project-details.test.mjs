import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
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
      await readFile(new URL("../public/data/itch-projects.json", import.meta.url), "utf8"),
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

  it("provides curated breakdown details for every synced Unity GitHub tool", async () => {
    const tools = JSON.parse(
      await readFile(new URL("../public/data/github-projects.json", import.meta.url), "utf8"),
    );

    for (const repo of tools) {
      const details = resolveToolDetails(repo);
      assert.equal(details.kind, "tool");
      assert.equal(details.title, repo.name);
      assert.ok(details.role.length > 0);
      assert.ok(details.focus.length > 0);
      assert.ok(details.highlights.length >= 3, `Expected highlights for ${repo.name}`);
      assert.ok(details.stack.length >= 3, `Expected stack tags for ${repo.name}`);
    }
  });

  it("exposes concise Selected Projects entries for the ATS resume", () => {
    assert.ok(RESUME_SELECTED_PROJECTS.length >= 4);
    for (const item of RESUME_SELECTED_PROJECTS) {
      assert.ok(item.name.length > 0);
      assert.ok(item.role.length > 0);
      assert.ok(item.url.startsWith("https://"));
      assert.ok(item.bullets.length >= 1);
    }
  });
});
