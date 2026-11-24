export const GITHUB_USERNAME = "haruchanz64";

export const EXCLUDED_LATEST_REPOS = new Set([
  GITHUB_USERNAME.toLowerCase(),
  `${GITHUB_USERNAME.toLowerCase()}.github.io`,
]);

export const PINNED_REPOS = [
  "UnityAuthCore",
  "GachaEngine",
  "AssetImportRules",
  "CustomAnimHandler",
  "CharacterMotor",
  "GameBalancer",
  "NetAuditToolkit",
  "NetSimToolkit",
  "BugReportToolkit",
  "SpreadsheetToScriptableObjects",
  "UnityEventToolkit",
  "SaveEncryptionToolkit",
  "ScriptableBatchTool",
  "DebugCommandSystem",
];

/**
 * Filter and normalize GitHub API repository objects to the pinned portfolio list.
 * @param {Array<{ name: string, html_url: string, description?: string | null, language?: string | null }>} repos
 */
export function mapPinnedRepos(repos) {
  return PINNED_REPOS.map((name) => {
    const repo = repos.find((r) => r.name === name);
    if (!repo) return null;
    return {
      name: repo.name,
      html_url: repo.html_url,
      description: repo.description || "",
      language: repo.language || "N/A",
      topics: Array.isArray(repo.topics) ? repo.topics : [],
    };
  }).filter(Boolean);
}

/**
 * Select the newest public, non-fork, non-archived GitHub repositories (excluding meta repos).
 * Preserves input order when timestamps are missing (e.g., offline fallback JSON).
 * @param {Array<{ name?: string, html_url?: string, description?: string | null, language?: string | null, fork?: boolean, archived?: boolean, created_at?: string, pushed_at?: string }>} repos
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
    .map((repo, index) => ({
      repo,
      index,
      timestamp: Date.parse(repo.created_at || repo.pushed_at || "") || 0,
    }));

  const hasTimestamps = candidates.some((entry) => entry.timestamp > 0);
  if (hasTimestamps) {
    candidates.sort((a, b) => b.timestamp - a.timestamp || a.index - b.index);
  }

  return candidates.slice(0, count).map(({ repo }) => ({
    name: repo.name,
    html_url: repo.html_url,
    description: repo.description || "",
    language: repo.language || "N/A",
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    ...(repo.created_at ? { created_at: repo.created_at } : {}),
  }));
}
