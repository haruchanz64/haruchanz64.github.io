import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWithRetry } from "../src/js/core/http.js";
import { decodeHtmlEntities } from "../src/js/core/text.js";

const ITCH_PROFILE_URL = "https://haruchanz64.itch.io/";
const ITCH_REQUEST_HEADERS = {
  "User-Agent": "haru-portfolio-sync/1.0 (+https://haruchanz64.github.io/)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const EXCLUDED_ITCH_SLUGS = new Set([
  "api",
  "assets",
  "cdn",
  "comments",
  "css",
  "devlogs",
  "feed",
  "follow",
  "followers",
  "following",
  "js",
  "login",
  "profile",
  "register",
  "rss",
]);

const INVALID_TITLE_PATTERNS = [
  /^just a moment/i,
  /^attention required/i,
  /page not found/i,
  /\b404\b/i,
];

const ITCH_EXTRA_TAGS = {
  "https://haruchanz64.itch.io/trashfrenzy": ["Capstone Project"],
};

export const FALLBACK_ITCH_URLS = [
  "https://haruchanz64.itch.io/trashfrenzy",
  "https://haruchanz64.itch.io/cyclescape",
  "https://haruchanz64.itch.io/orders-please",
  "https://haruchanz64.itch.io/night-light",
];

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ITCH_PROJECTS_OUTPUT_PATH = resolve(__dirname, "../src/data/itch-projects.json");
const IMAGES_DIR = resolve(__dirname, "../public/res/itch");

function defaultSleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function normalizeItchUrl(url) {
  return String(url ?? "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

/**
 * Extract valid itch.io game URLs from a creator profile HTML page, avoiding
 * non-game paths (e.g. `/follow`, `/devlogs`, `/feed.xml`) that would return 404.
 * @param {string} html
 * @returns {string[]}
 */
export function extractItchGameUrls(html) {
  if (typeof html !== "string" || !html) return [];

  const collect = (pattern) => {
    const urls = [];
    for (const match of html.matchAll(pattern)) {
      const url = normalizeItchUrl(match[1]);
      const slug = (match[2] || "").toLowerCase();
      if (!url || !slug || EXCLUDED_ITCH_SLUGS.has(slug)) continue;
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
    return urls;
  };

  // Prefer explicit itch.io game-grid anchor links when present.
  const gameAnchorPatterns = [
    /<a\b[^>]*\bclass=["'][^"']*\b(?:game_link|thumb_link)\b[^"']*["'][^>]*\bhref=["'](https:\/\/haruchanz64\.itch\.io\/([a-z0-9-]+))\/?(?:[?#][^"']*)?["']/gi,
    /<a\b[^>]*\bhref=["'](https:\/\/haruchanz64\.itch\.io\/([a-z0-9-]+))\/?(?:[?#][^"']*)?["'][^>]*\bclass=["'][^"']*\b(?:game_link|thumb_link)\b[^"']*["']/gi,
  ];

  const cardUrls = [];
  for (const pattern of gameAnchorPatterns) {
    for (const url of collect(pattern)) {
      if (!cardUrls.includes(url)) {
        cardUrls.push(url);
      }
    }
  }
  if (cardUrls.length > 0) {
    return cardUrls;
  }

  // Fallback: bounded href attributes only (never matches partial paths like `/feed.xml`).
  return collect(
    /\bhref=["'](https:\/\/haruchanz64\.itch\.io\/([a-z0-9-]+))\/?(?:[?#][^"']*)?["']/gi,
  );
}

export async function discoverItchProjects({
  fetchImpl,
  sleep,
  attempts = 3,
  baseDelayMs = 600,
  timeoutMs = 12_000,
} = {}) {
  try {
    const res = await fetchWithRetry(
      ITCH_PROFILE_URL,
      { headers: ITCH_REQUEST_HEADERS },
      { attempts, baseDelayMs, timeoutMs, fetchImpl, sleep },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const discovered = extractItchGameUrls(html);
    const urls = discovered.length > 0 ? discovered : FALLBACK_ITCH_URLS;
    return urls.map((url) => ({ url, extraTags: ITCH_EXTRA_TAGS[url] || [] }));
  } catch (err) {
    console.warn(`Warning: itch.io profile discovery failed (${err.message}), using fallback list`);
    return FALLBACK_ITCH_URLS.map((url) => ({ url, extraTags: ITCH_EXTRA_TAGS[url] || [] }));
  }
}

function getMetaContent(html, attrName, attrValue) {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]*${attrName}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return "";
}

function extractInfoRow(html, label) {
  const rowRegex = new RegExp(
    `<tr>\\s*<td>\\s*${label}\\s*</td>\\s*<td>([\\s\\S]*?)</td>\\s*</tr>`,
    "i",
  );
  const match = html.match(rowRegex);
  if (!match?.[1]) return [];

  return match[1]
    .replace(/<[^>]+>/g, " ")
    .split(",")
    .map((item) => decodeHtmlEntities(item.replace(/\s+/g, " ").trim()))
    .filter(Boolean);
}

async function readExistingItchProjects(outputPath) {
  try {
    const raw = await readFile(outputPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    return new Map(
      parsed.filter((item) => item?.url).map((item) => [normalizeItchUrl(item.url), item]),
    );
  } catch {
    return new Map();
  }
}

async function downloadItchImage(
  imageUrl,
  projectUrl,
  { existingImage = "", imagesDir = IMAGES_DIR, fetchImpl, sleep } = {},
) {
  if (!imageUrl) return existingImage || "";
  try {
    const slug = new URL(projectUrl).pathname.replace(/^\/+|\/+$/g, "") || "cover";
    const res = await fetchWithRetry(
      imageUrl,
      { headers: { "User-Agent": ITCH_REQUEST_HEADERS["User-Agent"] } },
      { attempts: 2, baseDelayMs: 400, timeoutMs: 10_000, fetchImpl, sleep },
    );
    if (!res.ok) return existingImage || imageUrl;

    const contentType = res.headers?.get?.("content-type") || "";
    const extMatch = imageUrl.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/i);
    const ext = extMatch
      ? extMatch[1].toLowerCase()
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg")
          ? "jpg"
          : "png";

    const filename = `${slug}.${ext}`;
    await mkdir(imagesDir, { recursive: true });
    await writeFile(resolve(imagesDir, filename), Buffer.from(await res.arrayBuffer()));
    return `/res/itch/${filename}`;
  } catch {
    return existingImage || imageUrl;
  }
}

export async function fetchItchProject(
  entry,
  {
    existingProject = null,
    imagesDir = IMAGES_DIR,
    fetchImpl,
    sleep,
    attempts = 3,
    baseDelayMs = 600,
    timeoutMs = 12_000,
  } = {},
) {
  const res = await fetchWithRetry(
    entry.url,
    { headers: ITCH_REQUEST_HEADERS },
    { attempts, baseDelayMs, timeoutMs, fetchImpl, sleep },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch ${entry.url}: HTTP ${res.status}`);
  }

  const html = await res.text();
  const rawTitle =
    getMetaContent(html, "name", "twitter:title") ||
    html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ||
    "";
  const title = rawTitle.replace(/\s+by\s+[^|]+$/i, "").trim();

  if (!title || INVALID_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    throw new Error(`Invalid or challenge page returned for ${entry.url} (title="${title}")`);
  }

  const description =
    getMetaContent(html, "property", "og:description") ||
    getMetaContent(html, "name", "description");

  const remoteImage =
    getMetaContent(html, "property", "twitter:image") ||
    getMetaContent(html, "property", "og:image");
  const image = await downloadItchImage(remoteImage, entry.url, {
    existingImage: existingProject?.image || "",
    imagesDir,
    fetchImpl,
    sleep,
  });

  const genres = extractInfoRow(html, "Genre");
  const platforms = extractInfoRow(html, "Platforms");

  return {
    title,
    url: entry.url,
    description,
    image,
    tags: [...(entry.extraTags || []), ...genres.slice(0, 1)],
    platforms,
  };
}

export async function syncItchProjects({
  outputPath = ITCH_PROJECTS_OUTPUT_PATH,
  imagesDir = IMAGES_DIR,
  fetchImpl,
  sleep = defaultSleep,
  requestDelayMs = 250,
  attempts = 3,
  baseDelayMs = 600,
  timeoutMs = 12_000,
} = {}) {
  const existingByUrl = await readExistingItchProjects(outputPath);
  const entries = await discoverItchProjects({
    fetchImpl,
    sleep,
    attempts,
    baseDelayMs,
    timeoutMs,
  });

  const projects = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const existingProject = existingByUrl.get(normalizeItchUrl(entry.url)) || null;
    if (i > 0 && requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }

    try {
      const project = await fetchItchProject(entry, {
        existingProject,
        imagesDir,
        fetchImpl,
        sleep,
        attempts,
        baseDelayMs,
        timeoutMs,
      });
      projects.push(project);
    } catch (err) {
      if (existingProject) {
        console.warn(
          `Warning: keeping previously synced itch.io project for ${entry.url} (${err.message})`,
        );
        projects.push(existingProject);
      } else {
        console.warn(`Warning: skipping itch.io project ${entry.url} (${err.message})`);
      }
    }
  }

  if (projects.length === 0) {
    throw new Error("No itch.io projects found");
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  console.log(`Synced ${projects.length} itch.io projects to ${outputPath}`);
  return projects;
}

const isMainModule =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  syncItchProjects().catch((err) => {
    console.warn(`Warning: failed to sync itch.io projects (${err.message})`);
    process.exitCode = 0;
  });
}
