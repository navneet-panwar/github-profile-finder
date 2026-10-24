// Collects the page elements by id, with types, and throws if one is missing.
// `hidden` on <html> keeps everything invisible until the content is drawn,
// so hidden="false" attributes in index.html never flash on screen.

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`Missing ${selector} in index.html`);
  }
  return found;
};

export const els = {
  html: document.documentElement,
  search: $<HTMLInputElement>("#username-input"),
  status: $<HTMLParagraphElement>("#status-message"),
  empty: $("#empty-message"),

  profile: $<HTMLElement>("#profile"),
  avatar: $<HTMLImageElement>("#profile-avatar"),
  name: $<HTMLElement>("#profile-name"),
  login: $<HTMLParagraphElement>("#profile-login"),
  bio: $<HTMLParagraphElement>("#profile-bio"),
  reposStat: $("#stat-repos"),
  followersStat: $("#stat-followers"),
  followingStat: $("#stat-following"),
  profileLink: $<HTMLAnchorElement>("#profile-link"),

  reposSection: $<HTMLElement>("#repos-section"),
  reposHeading: $("#repos-heading"),
  repoList: $<HTMLUListElement>("#repo-list"),
  loadMore: $<HTMLButtonElement>("#load-more"),

  recentSection: $<HTMLElement>("#recent-section"),
  recentList: $<HTMLUListElement>("#recent-list"),
  clearRecent: $<HTMLButtonElement>("#clear-recent")
};
