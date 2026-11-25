import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { syncGithubProjects } from "../scripts/sync-github.mjs";
import { extractItchGameUrls, syncItchProjects } from "../scripts/sync-itch.mjs";
import { fetchWithRetry } from "../src/js/core/http.js";
import { loadCachedList } from "../src/js/projects/projects-shared.js";

const noopSleep = async () => {};

function createResponse({ ok = true, status = 200, body = "", headers = {} } = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
  );
  return {
    ok,
    status,
    headers: {
      get(name) {
        return normalizedHeaders.get(name.toLowerCase()) ?? null;
      },
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
    async json() {
      return typeof body === "string" ? JSON.parse(body) : body;
    },
    async arrayBuffer() {
      return new TextEncoder().encode(String(body)).buffer;
    },
  };
}

describe("fetchWithRetry", () => {
  it("retries transient 404 responses and returns the succeeding response", async () => {
    let calls = 0;
    const delays = [];
    const fetchImpl = async () => {
      calls += 1;
      if (calls < 3) {
        return createResponse({ ok: false, status: 404 });
      }
      return createResponse({ ok: true, status: 200, body: [{ ok: true }] });
    };

    const res = await fetchWithRetry(
      "https://example.test/data",
      {},
      {
        attempts: 3,
        baseDelayMs: 50,
        fetchImpl,
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    );

    assert.equal(res.status, 200);
    assert.equal(calls, 3);
    assert.deepEqual(delays, [50, 100]);
  });

  it("does not retry non-transient 400 responses", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return createResponse({ ok: false, status: 400 });
    };

    const res = await fetchWithRetry(
      "https://example.test/bad",
      {},
      { attempts: 3, fetchImpl, sleep: noopSleep },
    );

    assert.equal(res.status, 400);
    assert.equal(calls, 1);
  });

  it("retries transient network errors before succeeding", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("socket hang up");
      }
      return createResponse({ ok: true, status: 200, body: "ok" });
    };

    const res = await fetchWithRetry(
      "https://example.test/flaky",
      {},
      { attempts: 2, fetchImpl, sleep: noopSleep },
    );

    assert.equal(res.ok, true);
    assert.equal(calls, 2);
  });
});

describe("extractItchGameUrls", () => {
  it("extracts only valid game links and ignores non-game paths or truncated asset URLs", () => {
    const html = `
      <link rel="alternate" type="application/rss+xml" href="https://haruchanz64.itch.io/feed.xml" />
      <a href="https://haruchanz64.itch.io/follow">Follow</a>
      <a href="https://haruchanz64.itch.io/devlogs">Devlogs</a>
      <div class="game_cell">
        <a class="thumb_link game_link" href="https://haruchanz64.itch.io/trashfrenzy">Trash Frenzy</a>
      </div>
      <div class="game_cell">
        <a href="https://haruchanz64.itch.io/orders-please/" class="game_link">Orders Please</a>
      </div>
      <script>const url = "https://haruchanz64.itch.io/not-a-game-script";</script>
    `;

    assert.deepEqual(extractItchGameUrls(html), [
      "https://haruchanz64.itch.io/trashfrenzy",
      "https://haruchanz64.itch.io/orders-please",
    ]);
  });

  it("falls back to bounded href extraction without matching dotted filenames", () => {
    const html = `
      <a href="https://haruchanz64.itch.io/feed.xml">RSS</a>
      <a href="https://haruchanz64.itch.io/profile">Profile</a>
      <a href="https://haruchanz64.itch.io/night-light?ref=home">Night Light</a>
    `;

    assert.deepEqual(extractItchGameUrls(html), ["https://haruchanz64.itch.io/night-light"]);
  });
});

describe("syncItchProjects resilience", () => {
  it("preserves previously synced entry when one game page returns 404 or a challenge page", async () => {
    const dir = await mkdtemp(join(tmpdir(), "haru-itch-sync-"));
    const outputPath = join(dir, "itch-projects.json");
    const imagesDir = join(dir, "images");

    try {
      const existing = [
        {
          title: "Trash Frenzy",
          url: "https://haruchanz64.itch.io/trashfrenzy",
          description: "Old cached description",
          image: "/res/itch/trashfrenzy.png",
          tags: ["Capstone Project", "Educational"],
          platforms: ["Android"],
        },
        {
          title: "Orders Please",
          url: "https://haruchanz64.itch.io/orders-please",
          description: "Street food vendor simulator.",
          image: "/res/itch/orders-please.png",
          tags: ["Simulation"],
          platforms: ["Windows"],
        },
      ];
      await writeFile(outputPath, JSON.stringify(existing), "utf8");

      const profileHtml = `
        <a class="game_link" href="https://haruchanz64.itch.io/trashfrenzy">Trash Frenzy</a>
        <a class="game_link" href="https://haruchanz64.itch.io/orders-please">Orders Please</a>
      `;
      const trashFrenzyHtml = `
        <html>
          <head>
            <meta name="twitter:title" content="Trash Frenzy by HaruChanZ64" />
            <meta property="og:description" content="Updated description." />
          </head>
          <body>
            <table>
              <tr><td>Genre</td><td>Educational</td></tr>
              <tr><td>Platforms</td><td>Android</td></tr>
            </table>
          </body>
        </html>
      `;

      const fetchImpl = async (url) => {
        if (url === "https://haruchanz64.itch.io/") {
          return createResponse({ ok: true, status: 200, body: profileHtml });
        }
        if (url === "https://haruchanz64.itch.io/trashfrenzy") {
          return createResponse({ ok: true, status: 200, body: trashFrenzyHtml });
        }
        if (url === "https://haruchanz64.itch.io/orders-please") {
          return createResponse({ ok: false, status: 404 });
        }
        return createResponse({ ok: false, status: 404 });
      };

      const synced = await syncItchProjects({
        outputPath,
        imagesDir,
        fetchImpl,
        sleep: noopSleep,
        requestDelayMs: 0,
        attempts: 2,
      });

      assert.equal(synced.length, 2);
      assert.equal(synced[0].description, "Updated description.");
      assert.equal(synced[0].image, "/res/itch/trashfrenzy.png");
      assert.deepEqual(synced[1], existing[1]);

      const written = JSON.parse(await readFile(outputPath, "utf8"));
      assert.equal(written.length, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("syncGithubProjects resilience", () => {
  it("retries transient 404 and does not overwrite output when API returns no eligible repos", async () => {
    const dir = await mkdtemp(join(tmpdir(), "haru-gh-sync-"));
    const outputPath = join(dir, "github-projects.json");

    try {
      let calls = 0;
      const fetchImpl = async () => {
        calls += 1;
        if (calls === 1) {
          return createResponse({ ok: false, status: 404 });
        }
        return createResponse({
          ok: true,
          status: 200,
          body: [
            {
              name: "MelodyRecognitionEngine",
              html_url: "https://github.com/haruchanz64/MelodyRecognitionEngine",
              description: "Pitch detection engine",
              language: "C#",
              topics: ["unity"],
              created_at: "2026-11-22T00:00:00Z",
            },
          ],
        });
      };

      const synced = await syncGithubProjects({
        outputPath,
        fetchImpl,
        sleep: noopSleep,
        attempts: 2,
      });

      assert.equal(calls, 2);
      assert.equal(synced.length, 1);
      assert.equal(synced[0].name, "MelodyRecognitionEngine");

      const originalContent = await readFile(outputPath, "utf8");
      await assert.rejects(
        () =>
          syncGithubProjects({
            outputPath,
            fetchImpl: async () => createResponse({ ok: true, status: 200, body: [] }),
            sleep: noopSleep,
            attempts: 1,
          }),
        /no eligible repositories/i,
      );
      assert.equal(await readFile(outputPath, "utf8"), originalContent);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("loadCachedList fallback behavior", () => {
  it("falls back cleanly when primary returns an empty array", async () => {
    const fallbackItems = [{ name: "MelodyRecognitionEngine" }];
    const result = await loadCachedList({
      cacheKey: "test_empty_primary_fallback",
      ttlMs: 60_000,
      fetchPrimary: async () => [],
      fetchFallback: async () => fallbackItems,
      label: "Test projects",
    });

    assert.deepEqual(result, fallbackItems);
  });
});
