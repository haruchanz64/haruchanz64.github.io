import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeHtmlEntities } from "../src/js/core/text.js";

const ITCH_PROJECTS = [
  {
    url: "https://haruchanz64.itch.io/trashfrenzy",
    extraTags: ["Capstone Project"],
  },
  { url: "https://haruchanz64.itch.io/cyclescape" },
  { url: "https://haruchanz64.itch.io/orders-please" },
  { url: "https://haruchanz64.itch.io/night-light" },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../public/data/itch-projects.json");
const IMAGES_DIR = resolve(__dirname, "../public/res/itch");

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

async function downloadItchImage(imageUrl, projectUrl) {
  if (!imageUrl) return "";
  try {
    const slug = new URL(projectUrl).pathname.replace(/^\/+|\/+$/g, "") || "cover";
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "haru-portfolio-sync/1.0" },
    });
    if (!res.ok) return imageUrl;

    const contentType = res.headers.get("content-type") || "";
    const extMatch = imageUrl.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/i);
    const ext = extMatch
      ? extMatch[1].toLowerCase()
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("jpeg")
          ? "jpg"
          : "png";

    const filename = `${slug}.${ext}`;
    await mkdir(IMAGES_DIR, { recursive: true });
    await writeFile(resolve(IMAGES_DIR, filename), Buffer.from(await res.arrayBuffer()));
    return `/res/itch/${filename}`;
  } catch {
    return imageUrl;
  }
}

async function fetchItchProject(entry) {
  const res = await fetch(entry.url, {
    headers: {
      "User-Agent": "haru-portfolio-sync/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${entry.url}: HTTP ${res.status}`);
  }

  const html = await res.text();
  const rawTitle =
    getMetaContent(html, "name", "twitter:title") ||
    html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ||
    "";
  const title = rawTitle.replace(/\s+by\s+[^|]+$/i, "").trim();

  const description =
    getMetaContent(html, "property", "og:description") ||
    getMetaContent(html, "name", "description");

  const remoteImage =
    getMetaContent(html, "property", "twitter:image") ||
    getMetaContent(html, "property", "og:image");
  const image = await downloadItchImage(remoteImage, entry.url);

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

async function main() {
  const projects = await Promise.all(ITCH_PROJECTS.map(fetchItchProject));
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(projects, null, 2)}\n`);
  console.log(`Synced ${projects.length} itch.io projects to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
