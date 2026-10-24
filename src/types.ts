// These match what the GitHub API sends back. I only kept the fields the page uses,
// so it is easy to see what the app depends on.

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

// The possible results of a search, as one type. This way the UI has to handle
// every case, and TypeScript warns me if I forget one.
export type SearchResult =
  | { kind: "idle" }
  | { kind: "loading"; username: string }
  | { kind: "invalid"; message: string }
  | { kind: "notFound"; username: string }
  | { kind: "rateLimited" }
  | { kind: "networkError" }
  | { kind: "success"; user: GitHubUser; repos: GitHubRepo[] };
