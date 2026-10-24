import { addRecent, debounce } from "./utils";
import { findUser, type SearchResult } from "./search";
import { canLoadMore, fetchRepos } from "./repos";
import { loadRecent, saveRecent } from "./storage";
import {
  appendRepos,
  setLoadMore,
  showEmptyState,
  showError,
  showLoading,
  showNoRepos,
  showProfile,
  showRepoError,
  startRepoList,
  clearStatus
} from "./ui";
import { normalizeUsername } from "./api";
import { els } from "./elements";

// ----- state -----
// A few simple variables about what is on screen right now.

let recent: string[] = loadRecent();
let currentLogin: string | null = null;
let loadedRepos = 0;
let nextPage = 1;
let searchNumber = 0; // used to ignore answers from an outdated search
const searchInput = els.search;
const clearButton = els.clearRecent;

// ----- search -----

async function search(username: string): Promise<void> {
  searchNumber += 1;
  const thisSearch = searchNumber;

  showLoading(username);
  const result: SearchResult = await findUser(username);

  // A newer search already started while this one was still loading.
  if (thisSearch !== searchNumber) {
    return;
  }

  if (result.status === "success") {
    showProfile(result.user);
    currentLogin = result.user.login;
    startRepoList(result.user.login, result.repoCount);
    await loadFirstPage(result.user.login);
    rememberSearch(result.user.login);
    return;
  }

  currentLogin = null;
  showError(result);
}

// Debounced: called on every keystroke, but only runs after a short pause.
const searchLater = debounce((value: string) => {
  const username = normalizeUsername(value);
  if (username === "") {
    searchNumber += 1; // cancel any search still loading
    currentLogin = null;
    showEmptyState();
    return;
  }
  void search(username);
}, 500);

searchInput.addEventListener("input", () => {
  const value = searchInput.value;
  searchLater(value);
});

// Pressing Enter skips the wait.
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const value = searchInput.value;
    const username = normalizeUsername(value);
    if (username !== "") {
      void search(username);
    }
  }
});

// ----- repositories -----

async function loadFirstPage(login: string): Promise<void> {
  await loadPage(login, 1);
}

async function loadPage(login: string, page: number): Promise<void> {
  setLoadMore("loading");

  try {
    const repos = await fetchRepos(login, page);

    // The user may have searched someone else while this was loading.
    if (login !== currentLogin) {
      return;
    }

    loadedRepos += repos.length;
    nextPage = page + 1;
    appendRepos(repos, loadedRepos);

    if (repos.length === 0 && loadedRepos === 0) {
      showNoRepos();
    }
    setLoadMore(canLoadMore(page, repos.length) ? "ready" : "hidden");

    // Now that the repos are on screen, the "Looking up" line can go.
    if (page === 1) {
      clearStatus();
    }
  } catch (error) {
    if (login !== currentLogin) {
      return;
    }
    const text =
      error instanceof Error && error.message === "rate limit"
        ? "GitHub says too many requests were made. Wait a minute, then press Load more."
        : "Could not load the repositories. Check your connection and try again.";
    showRepoError(text);
  }
}

els.loadMore.addEventListener("click", () => {
  if (currentLogin === null) {
    return;
  }
  void loadPage(currentLogin, nextPage);
});

// ----- recent searches -----

function rememberSearch(login: string): void {
  recent = addRecent(recent, login);
  saveRecent(recent);
  renderRecent();
}

function renderRecent(): void {
  els.recentList.replaceChildren();
  els.recentSection.hidden = recent.length === 0;

  for (const username of recent) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = username;
    button.setAttribute("aria-label", `Search for ${username} again`);
    button.addEventListener("click", () => {
      els.search.value = username;
      void search(username);
    });
    item.append(button);
    els.recentList.append(item);
  }
}

clearButton.addEventListener("click", () => {
  recent = [];
  saveRecent(recent);
  renderRecent();
});

// ----- start -----

renderRecent();
showEmptyState();

// ?user=octocat in the address bar opens that profile straight away.
const fromUrl = new URLSearchParams(window.location.search).get("user");
if (fromUrl !== null) {
  searchInput.value = fromUrl;
  void search(fromUrl);
}


