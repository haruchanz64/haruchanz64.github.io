export const GITHUB_USERNAME = "haruchanz64";

export const EXCLUDED_LATEST_REPOS = new Set([
  GITHUB_USERNAME.toLowerCase(),
  `${GITHUB_USERNAME.toLowerCase()}.github.io`,
  // Legacy repositories consolidated into ScriptableDataToolkit, NetQAToolkit, and DevQAToolkit
  "scriptablebatchtool",
  "spreadsheettoscriptableobjects",
  "netaudittoolkit",
  "netsimtoolkit",
  "bugreporttoolkit",
  "debugcommandsystem",
]);

export const REPO_RELEASE_DATES = {
  DevQAToolkit: "2026-11-28",
  NetQAToolkit: "2026-11-27",
  ScriptableDataToolkit: "2026-11-25",
  UtilityAIEngine: "2026-11-21",
  MelodyRecognitionEngine: "2026-11-19",
  GachaEngine: "2026-10-09",
  CommonEventsEngine: "2026-08-23",
  UnityAuthCore: "2026-07-11",
  GameBalancer: "2026-03-07",
  CharacterMotor: "2026-01-24",
  PlayablesAnimatorController: "2025-12-12",
  AssetImportRules: "2025-11-03",
  UnityEventAuditor: "2025-07-01",
  SaveEncryptionToolkit: "2025-06-26",
};

export const PINNED_REPOS = Object.keys(REPO_RELEASE_DATES);

const SHORT_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Resolve the canonical YYYY-MM-DD release date for a GitHub repository.
 * Prefers explicit `released_at` or curated `REPO_RELEASE_DATES`, falling back to `created_at`.
 * @param {{ name?: string, released_at?: string | null, created_at?: string | null } | null | undefined} repo
 * @returns {string}
 */
export function resolveRepoReleaseDate(repo) {
  if (!repo) return "";
  const explicit =
    typeof repo.released_at === "string" && repo.released_at.trim()
      ? repo.released_at.trim().slice(0, 10)
      : "";
  if (explicit) return explicit;

  if (repo.name && Object.hasOwn(REPO_RELEASE_DATES, repo.name)) {
    return REPO_RELEASE_DATES[repo.name];
  }

  if (typeof repo.created_at === "string" && repo.created_at.trim()) {
    return repo.created_at.trim().slice(0, 10);
  }

  return "";
}

/**
 * Format a YYYY-MM-DD (or ISO) date string into a concise Month Year label for cards and modals.
 * @param {string | null | undefined} isoDate
 * @returns {string}
 */
export function formatReleaseDate(isoDate) {
  if (!isoDate || typeof isoDate !== "string") return "";
  const match = /^(\d{4})-(\d{2})/.exec(isoDate.trim());
  if (!match) return "";

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return "";

  return `${SHORT_MONTHS_EN[monthIndex]} ${year}`;
}

/**
 * Filter and normalize GitHub API repository objects to the pinned portfolio list.
 * @param {Array<{ name: string, html_url: string, description?: string | null, language?: string | null, released_at?: string | null, created_at?: string | null }>} repos
 */
export function mapPinnedRepos(repos) {
  return PINNED_REPOS.map((name) => {
    const repo = repos.find((r) => r.name === name);
    if (!repo) return null;
    const releasedAt = resolveRepoReleaseDate(repo);
    return {
      name: repo.name,
      html_url: repo.html_url,
      description: repo.description || "",
      language: repo.language || "N/A",
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      ...(releasedAt ? { released_at: releasedAt } : {}),
    };
  }).filter(Boolean);
}

/**
 * Select the newest public, non-fork, non-archived GitHub repositories (excluding meta repos).
 * Orders by curated/commit `released_at` when available, falling back to `created_at` or `pushed_at`.
 * Preserves input order when timestamps are missing (e.g., offline fallback JSON).
 * @param {Array<{ name?: string, html_url?: string, description?: string | null, language?: string | null, fork?: boolean, archived?: boolean, released_at?: string, created_at?: string, pushed_at?: string }>} repos
 * @param {number} [count=3]
 */
export function selectLatestGithubRepos(repos, count = 3) {
  if (!Array.isArray(repos) || count <= 0) return [];

  const candidates = repos
    .filter((repo) => {
      if (!repo?.name || !repo?.html_url) return false;
      if (repo.fork || repo.archived) return false;
      if (EXCLUDED_LATEST_REPOS.has(repo.name.toLowerCase())) return false;
      return true;
    })
    .map((repo, index) => {
      const releasedAt = resolveRepoReleaseDate(repo);
      const sortSource = releasedAt || repo.created_at || repo.pushed_at || "";
      return {
        repo,
        releasedAt,
        index,
        timestamp: Date.parse(sortSource) || 0,
      };
    });

  const hasTimestamps = candidates.some((entry) => entry.timestamp > 0);
  if (hasTimestamps) {
    candidates.sort((a, b) => b.timestamp - a.timestamp || a.index - b.index);
  }

  return candidates.slice(0, count).map(({ repo, releasedAt }) => ({
    name: repo.name,
    html_url: repo.html_url,
    description: repo.description || "",
    language: repo.language || "N/A",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    ...(releasedAt ? { released_at: releasedAt } : {}),
    ...(repo.created_at ? { created_at: repo.created_at } : {}),
  }));
}
