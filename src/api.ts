import type { GitHubRepo, GitHubUser } from "./types";

const API_URL = "https://api.github.com";

// GitHub usernames: letters, and single hyphens, up to 39 characters.
// We check this before sending a request so typos fail instantly.
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim());
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "");
}

export function userUrl(username: string): string {
  return `${API_URL}/users/${encodeURIComponent(username)}`;
}

// 5 most recently updated public repositories.
export function reposUrl(username: string): string {
  return `${API_URL}/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=5`;
}

// Small helpers to read unknown JSON safely. `key` is the field name we expect.
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isGitHubUser(value: unknown): value is GitHubUser {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.login === "string" &&
    typeof value.avatar_url === "string" &&
    typeof value.html_url === "string" &&
    typeof value.public_repos === "number" &&
    typeof value.followers === "number" &&
    typeof value.following === "number" &&
    typeof value.created_at === "string"
  );
}

export function isGitHubRepo(value: unknown): value is GitHubRepo {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.id === "number" &&
    typeof value.name === "string" &&
    typeof value.html_url === "string" &&
    typeof value.stargazers_count === "number" &&
    typeof value.forks_count === "number" &&
    typeof value.updated_at === "string"
  );
}

export function parseRepoList(value: unknown): GitHubRepo[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isGitHubRepo);
}

// Counts down to "3.5k" style numbers so the stats stay short.
export function formatCount(value: number): string {
  if (value < 1000) {
    return String(value);
  }
  const thousands = value / 1000;
  const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return `${rounded}k`;
}

// "2020-05-01T10:00:00Z" -> "May 2020"
export function formatJoined(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
