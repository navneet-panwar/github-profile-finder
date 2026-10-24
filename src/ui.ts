import type { GitHubRepo, GitHubUser } from "./types";
import type { SearchResult } from "./search";
import { els } from "./elements";
import { formatCount } from "./utils";

// All page updates live here. main.ts decides what happened;
// this file only knows how to show it.

// Start blank: reveal the page and show the empty state.
export function showEmptyState(): void {
  hideResults();
  els.empty.hidden = false;
  els.empty.textContent = "Type a username above to see a profile and their repositories.";
  els.html.hidden = false;
}

export function showLoading(username: string): void {
  hideResults();
  els.empty.hidden = true;
  setStatus(`Looking up ${username}…`);
  els.html.hidden = false;
}

export function showError(result: SearchResult): void {
  hideResults();
  els.empty.hidden = true;

  switch (result.status) {
    case "notFound":
      setStatus(`No GitHub user called “${result.username}”. Check the spelling and try again.`, true);
      break;
    case "rateLimited":
      setStatus("GitHub says this network has made too many requests. Wait a minute and try again.", true);
      break;
    case "invalid":
      setStatus("Usernames use letters, numbers and single hyphens, like octocat.", true);
      break;
    default:
      setStatus("Could not reach GitHub. Check your connection and try again.", true);
  }

  els.html.hidden = false;
}

export function showProfile(user: GitHubUser): void {
  els.html.hidden = false;
  els.profile.hidden = false;

  els.avatar.src = user.avatarUrl;
  // The name is written next to the image, so the alt text is short.
  els.avatar.alt = `${user.login}'s avatar`;

  els.name.textContent = user.name === "" ? user.login : user.name;
  els.login.textContent = `@${user.login}`;

  els.bio.textContent = user.bio;
  els.bio.hidden = user.bio === "";

  els.reposStat.textContent = formatCount(user.repos);
  els.followersStat.textContent = formatCount(user.followers);
  els.followingStat.textContent = formatCount(user.following);

  els.profileLink.href = user.htmlUrl;
  els.profileLink.textContent = `View @${user.login} on GitHub`;
}

export function startRepoList(login: string, repoCount: number | null): void {
  els.reposSection.hidden = false;
  els.repoList.replaceChildren();
  els.reposHeading.textContent = `Repositories (@${login})`;

  if (repoCount === 0) {
    showNoRepos();
  }
}

export function appendRepos(repos: GitHubRepo[], loadedSoFar: number): void {
  for (const repo of repos) {
    els.repoList.append(createRepoCard(repo));
  }
  els.reposHeading.textContent = `Repositories (${loadedSoFar} shown)`;
}

export function setLoadMore(state: "hidden" | "ready" | "loading"): void {
  els.loadMore.hidden = state === "hidden";
  els.loadMore.disabled = state === "loading";
  els.loadMore.textContent = state === "loading" ? "Loading…" : "Load more";
}

export function showNoRepos(): void {
  els.empty.hidden = false;
  els.empty.textContent = "This user has no public repositories yet.";
}

export function showRepoError(message: string): void {
  setStatus(message, true);
  setLoadMore("hidden");
}

// Empties the "Looking up…" line once results are on screen.
export function clearStatus(): void {
  setStatus("");
}

function setStatus(text: string, isError = false): void {
  els.status.textContent = text;
  if (isError) {
    els.status.dataset.tone = "error";
  } else {
    delete els.status.dataset.tone;
  }
}

function hideResults(): void {
  els.status.textContent = "";
  delete els.status.dataset.tone;
  els.empty.hidden = true;
  els.profile.hidden = true;
  els.reposSection.hidden = true;
  els.repoList.replaceChildren();
  els.loadMore.hidden = true;
}

function createRepoCard(repo: GitHubRepo): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "repo";

  const title = document.createElement("h3");
  const link = document.createElement("a");
  link.href = repo.htmlUrl;
  link.textContent = repo.name;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  title.append(link);

  const description = document.createElement("p");
  description.className = "repo-description";
  description.textContent = repo.description === "" ? "No description" : repo.description;

  const meta = document.createElement("p");
  meta.className = "repo-meta";
  const stars = repo.stars === 1 ? "1 star" : `${formatCount(repo.stars)} stars`;
  const language = repo.language === "" ? "No language" : repo.language;
  meta.textContent = `${language} · ${stars}`;

  item.append(title, description, meta);
  return item;
}
