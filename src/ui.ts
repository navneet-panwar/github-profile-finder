import type { GitHubRepo, GitHubUser, SearchResult } from "./types";
import { formatCount, formatJoined } from "./api";

// Grabs typed elements once. Each helper throws if index.html changed and an id is gone,
// which is better than a silent "possibly null" error later.
function byId<T extends Element>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing #${id}`);
  }
  return element as unknown as T;
}

const statusMessage = byId<HTMLParagraphElement>("status-message");

const profileSection = byId<HTMLElement>("profile");
const avatar = byId<HTMLImageElement>("profile-avatar");
const nameHeading = byId<HTMLHeadingElement>("profile-name");
const loginText = byId<HTMLParagraphElement>("profile-login");
const bioText = byId<HTMLParagraphElement>("profile-bio");
const locationItem = byId<HTMLLIElement>("profile-location");
const companyItem = byId<HTMLLIElement>("profile-company");
const blogItem = byId<HTMLLIElement>("profile-blog");
const joinedItem = byId<HTMLLIElement>("profile-joined");
const reposStat = byId<HTMLElement>("stat-repos");
const followersStat = byId<HTMLElement>("stat-followers");
const followingStat = byId<HTMLElement>("stat-following");
const profileLink = byId<HTMLAnchorElement>("profile-link");

const reposSection = byId<HTMLElement>("repos-section");
const repoList = byId<HTMLUListElement>("repo-list");
const noRepos = byId<HTMLParagraphElement>("no-repos");

export function render(result: SearchResult): void {
  reset();

  switch (result.kind) {
    case "idle":
      statusMessage.textContent = "";
      break;

    case "loading":
      statusMessage.textContent = `Looking up ${result.username}…`;
      break;

    case "invalid":
      statusMessage.textContent = result.message;
      break;

    case "notFound":
      statusMessage.textContent = `No GitHub user called "${result.username}". Check the spelling.`;
      break;

    case "rateLimited":
      statusMessage.textContent = "GitHub said too many requests were made. Wait a minute and try again.";
      break;

    case "networkError":
      statusMessage.textContent = "Could not reach GitHub. Check your connection and try again.";
      break;

    case "success":
      statusMessage.textContent = "";
      renderProfile(result.user);
      renderRepos(result.repos);
      break;
  }
}

function reset(): void {
  profileSection.hidden = true;
  reposSection.hidden = true;
  repoList.replaceChildren();
  statusMessage.classList.remove("error");
}

function renderProfile(user: GitHubUser): void {
  profileSection.hidden = false;

  avatar.src = user.avatar_url;
  // The photo is decoration next to the name, so an empty alt is correct.
  avatar.alt = "";
  nameHeading.textContent = user.name ?? user.login;
  // An empty name heading would leave the section without a real title.
  nameHeading.hidden = user.name === null;
  loginText.textContent = `@${user.login}`;

  bioText.textContent = user.bio ?? "";
  bioText.hidden = user.bio === null;

  setMetaItem(locationItem, "📍", user.location);
  setMetaItem(companyItem, "🏢", user.company);
  setMetaItem(joinedItem, "📅", `Joined ${formatJoined(user.created_at)}`);

  blogItem.hidden = user.blog === null || user.blog === "";
  if (user.blog !== null && user.blog !== "") {
    const link = document.createElement("a");
    const href = user.blog.startsWith("http") ? user.blog : `https://${user.blog}`;
    link.href = href;
    link.textContent = user.blog;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    blogItem.replaceChildren("🔗 ", link);
  }

  reposStat.textContent = formatCount(user.public_repos);
  followersStat.textContent = formatCount(user.followers);
  followingStat.textContent = formatCount(user.following);

  profileLink.href = user.html_url;
  profileLink.textContent = `Open @${user.login} on GitHub`;
}

function setMetaItem(item: HTMLLIElement, icon: string, text: string | null): void {
  item.hidden = text === null || text.trim() === "";
  if (text !== null) {
    item.textContent = `${icon} ${text}`;
  }
}

function renderRepos(repos: GitHubRepo[]): void {
  reposSection.hidden = false;
  noRepos.hidden = repos.length > 0;

  for (const repo of repos) {
    repoList.append(createRepoCard(repo));
  }
}

function createRepoCard(repo: GitHubRepo): HTMLLIElement {
  const card = document.createElement("li");
  card.className = "repo";

  const name = document.createElement("h3");
  const link = document.createElement("a");
  link.href = repo.html_url;
  link.textContent = repo.name;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  name.append(link);

  const description = document.createElement("p");
  description.className = "repo-description";
  description.textContent = repo.description ?? "No description";

  const meta = document.createElement("p");
  meta.className = "repo-meta";
  meta.textContent = [
    repo.language ?? "Unknown language",
    `★ ${formatCount(repo.stargazers_count)}`,
    `⑂ ${formatCount(repo.forks_count)}`
  ].join(" · ");

  card.append(name, description, meta);
  return card;
}
