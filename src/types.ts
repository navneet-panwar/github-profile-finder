// The data shapes used across the app.

// A GitHub user, cleaned up. Empty fields from the API become "" instead of null.
export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
  bio: string;
  repos: number;
  followers: number;
  following: number;
}

// One repository.
export interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  language: string;
  stars: number;
  htmlUrl: string;
}
