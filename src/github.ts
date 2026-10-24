import type { GitHubRepo, GitHubUser, SearchResult } from "./types";
import { isGitHubUser, parseRepoList, reposUrl, userUrl } from "./api";

// One request per call, two calls per search. Fine for a demo, and each part
// fails on its own so a broken repo list does not hide the profile.

export async function fetchUser(username: string): Promise<GitHubUser | null> {
  const response = await fetch(userUrl(username));

  if (response.status === 404) {
    return null;
  }
  if (response.status === 403) {
    throw new Error("rate limited");
  }
  if (!response.ok) {
    throw new Error(`GitHub responded with ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isGitHubUser(data)) {
    throw new Error("Unexpected user data");
  }
  return data;
}

export async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  const response = await fetch(reposUrl(username));
  if (!response.ok) {
    return [];
  }
  const data: unknown = await response.json();
  return parseRepoList(data);
}

// Turns a username into a SearchResult, so the rest of the app never sees raw errors.
export async function searchUser(username: string): Promise<SearchResult> {
  try {
    const user = await fetchUser(username);
    if (user === null) {
      return { kind: "notFound", username };
    }

    const repos = await fetchRepos(username);
    return { kind: "success", user, repos };
  } catch (error) {
    if (error instanceof Error && error.message === "rate limited") {
      return { kind: "rateLimited" };
    }
    return { kind: "networkError" };
  }
}
