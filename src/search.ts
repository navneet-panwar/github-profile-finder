import type { GitHubUser } from "./types";
import { isValidUsername, normalizeUsername } from "./api";

// Checks the typed text, then asks GitHub. Every outcome becomes a SearchResult,
// so the rest of the app never has to deal with a raw error.
export async function findUser(input: string): Promise<SearchResult> {
  const username = normalizeUsername(input);

  if (!isValidUsername(username)) {
    return { status: "invalid" };
  }

  try {
    return await requestUser(username);
  } catch (error) {
    // Network problems are thrown; a 404 is a normal response, handled below.
    if (error instanceof Error && error.message === "rate limit") {
      return { status: "rateLimited" };
    }
    return { status: "error" };
  }
}

async function requestUser(username: string): Promise<SearchResult> {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);

  if (response.status === 404) {
    return { status: "notFound", username };
  }
  if (response.status === 403) {
    throw new Error("rate limit");
  }
  if (!response.ok) {
    throw new Error("request failed");
  }

  const data: unknown = await response.json();
  const user = toUser(data);
  if (user === null) {
    throw new Error("bad data");
  }

  return { status: "success", user, repoCount: readRepoCount(response.headers.get("Link")) };
}

// GitHub puts the total number of repositories in the "Link" header, like
// <https://api.github.com/user/123/repos?page=2>; rel="last". No header means one page.
export function readRepoCount(linkHeader: string | null): number | null {
  if (linkHeader === null) {
    return null;
  }
  const match = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  if (match === null) {
    return null;
  }
  return Number(match[1]);
}

// The JSON from GitHub is `unknown`, so every field we use is checked here.
export function toUser(value: unknown): GitHubUser | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const data = value as Record<string, unknown>;

  if (
    typeof data.login !== "string" ||
    typeof data.avatar_url !== "string" ||
    typeof data.html_url !== "string" ||
    typeof data.public_repos !== "number" ||
    typeof data.followers !== "number" ||
    typeof data.following !== "number"
  ) {
    return null;
  }

  return {
    login: data.login,
    name: text(data.name),
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
    bio: text(data.bio),
    repos: data.public_repos,
    followers: data.followers,
    following: data.following
  };
}

// The possible results of a search. `status` says which one we have, and
// TypeScript gives us the extra fields for that status.
export type SearchResult =
  | { status: "idle" }
  | { status: "loading"; username: string }
  | { status: "success"; user: GitHubUser; repoCount: number | null }
  | { status: "notFound"; username: string }
  | { status: "rateLimited" }
  | { status: "error" }
  | { status: "invalid" };

// GitHub uses null for empty fields; we just use "" (empty text).
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
