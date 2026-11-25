import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchWithRetry } from "../src/js/core/http.js";
import { GITHUB_USERNAME, selectLatestGithubRepos } from "../src/js/projects/github-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const GITHUB_PROJECTS_OUTPUT_PATH = resolve(__dirname, "../src/data/github-projects.json");
const GITHUB_REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&type=owner&sort=created&direction=desc`;

export async function syncGithubProjects({
  token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  outputPath = GITHUB_PROJECTS_OUTPUT_PATH,
  fetchImpl,
  sleep,
  attempts = 3,
  baseDelayMs = 600,
  timeoutMs = 12_000,
} = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "haru-portfolio-sync/1.0",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetchWithRetry(
    GITHUB_REPOS_URL,
    { headers },
    { attempts, baseDelayMs, timeoutMs, fetchImpl, sleep },
  );

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }

  const rawRepos = await res.json();
  if (!Array.isArray(rawRepos)) {
    throw new Error("GitHub API returned unexpected non-array payload");
  }

  const synced = selectLatestGithubRepos(rawRepos, 100).map(
    ({ created_at: _createdAt, ...repo }) => repo,
  );
  if (synced.length === 0) {
    throw new Error("GitHub API returned no eligible repositories");
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(synced, null, 2)}\n`, "utf8");
  console.log(`Synced ${synced.length} GitHub projects to ${outputPath}`);
  return synced;
}

const isMainModule =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  syncGithubProjects().catch((err) => {
    console.warn(`Warning: failed to sync GitHub projects (${err.message})`);
    process.exitCode = 0;
  });
}
