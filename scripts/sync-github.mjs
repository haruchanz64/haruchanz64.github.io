import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GITHUB_USERNAME, selectLatestGithubRepos } from "../src/js/projects/github-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../public/data/github-projects.json");

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "haru-portfolio-sync/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner&sort=created&direction=desc`,
    { headers },
  );

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }

  const synced = selectLatestGithubRepos(await res.json(), 100).map(
    ({ created_at: _createdAt, ...repo }) => repo,
  );

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(synced, null, 2)}\n`, "utf8");
  console.log(`Synced ${synced.length} GitHub projects to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.warn(`Warning: failed to sync GitHub projects (${err.message})`);
  process.exitCode = 0;
});
