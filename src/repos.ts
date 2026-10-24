import type { GitHubRepo } from "./types";

export const PER_PAGE = 6;
export const MAX_PAGES = 5;

// One page is six repos, newest first. GitHub starts counting pages at 1.
export async function fetchRepos(username: string, page: number): Promise<GitHubRepo[]> {
  const query = new URLSearchParams({
    sort: "updated",
    per_page: String(PER_PAGE),
    page: String(page)
  });
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?${query.toString()}`;

  const response = await fetch(url);
  if (response.status === 403) {
    throw new Error("rate limit");
  }
  if (!response.ok) {
    throw new Error("request failed");
  }

  const data: unknown = await response.json();
  return toRepos(data);
}

// If a whole page came back there may be more, but we stop after MAX_PAGES
// so the traffic stays friendly to the free API.
export function canLoadMore(page: number, received: number): boolean {
  return received === PER_PAGE && page < MAX_PAGES;
}

// Drops anything that is not shaped like a repository instead of crashing.
export function toRepos(value: unknown): GitHubRepo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const repos: GitHubRepo[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const repo = item as Record<string, unknown>;
    if (
      typeof repo.id !== "number" ||
      typeof repo.name !== "string" ||
      typeof repo.html_url !== "string" ||
      typeof repo.stargazers_count !== "number"
    ) {
      continue;
    }

    repos.push({
      id: repo.id,
      name: repo.name,
      description: text(repo.description),
      language: text(repo.language),
      stars: repo.stargazers_count,
      htmlUrl: repo.html_url
    });
  }
  return repos;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
