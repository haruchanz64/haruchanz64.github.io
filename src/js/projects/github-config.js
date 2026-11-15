export const GITHUB_USERNAME = "haruchanz64";

export const PINNED_REPOS = [
  "UnityEventToolkit",
  "DebugCommandSystem",
  "ScriptableBatchTool",
  "SaveEncryptionToolkit",
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
    };
  }).filter(Boolean);
}
