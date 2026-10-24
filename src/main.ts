import type { SearchResult } from "./types";
import { isValidUsername, normalizeUsername } from "./api";
import { searchUser } from "./github";
import { render } from "./ui";

const form = document.querySelector<HTMLFormElement>("#search-form");
const input = document.querySelector<HTMLInputElement>("#username-input");

if (form === null || input === null) {
  throw new Error("Search form is missing from index.html");
}

// Keeps track of the newest search so a slow, earlier response cannot overwrite it.
let latestSearch = 0;

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = normalizeUsername(input.value);

  if (username === "") {
    render({ kind: "invalid", message: "Please type a username first." });
    input.focus();
    return;
  }

  if (!isValidUsername(username)) {
    render({ kind: "invalid", message: "That does not look like a GitHub username." });
    input.focus();
    return;
  }

  runSearch(username);
});

async function runSearch(username: string): Promise<void> {
  latestSearch += 1;
  const thisSearch = latestSearch;

  render({ kind: "loading", username });

  const result: SearchResult = await searchUser(username);

  // Another search started while this one was loading, so ignore this result.
  if (thisSearch !== latestSearch) {
    return;
  }

  render(result);

  if (result.kind === "success") {
    // Handy when you refresh or share the link.
    const url = new URL(window.location.href);
    url.searchParams.set("user", result.user.login);
    window.history.replaceState(null, "", url);
  }
}

// If the URL already has ?user=someone, search for them on load.
const fromUrl = new URLSearchParams(window.location.search).get("user");
if (fromUrl !== null) {
  input.value = fromUrl;
  void runSearch(fromUrl);
}
