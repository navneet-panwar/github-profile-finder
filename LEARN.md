# LEARN.md — studying GitHub Profile Finder

## 1. Map of the project

| File                | What it does                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`        | The static parts of the page: heading, search form, empty profile card and repo list with ids.                                                                                               |
| `src/types.ts`      | `GitHubUser` and `GitHubRepo` (the fields we use) and the `SearchResult` union.                                                                                                              |
| `src/api.ts`        | Pure helpers: `isValidUsername`, `normalizeUsername`, `userUrl`, `reposUrl`, the JSON checks (`isGitHubUser`, `isGitHubRepo`, `parseRepoList`) and formatters `formatCount`, `formatJoined`. |
| `src/github.ts`     | `fetchUser`, `fetchRepos` and `searchUser`, which turns any error into a `SearchResult`.                                                                                                     |
| `src/ui.ts`         | `render(result)` — one `switch` that updates the page for each kind of result.                                                                                                               |
| `src/main.ts`       | Reads the form, validates, calls `searchUser`, ignores stale responses, writes `?user=` to the URL.                                                                                          |
| `src/style.css`     | Colors as CSS variables, dark mode block, mobile media query.                                                                                                                                |
| `tests/api.test.ts` | Vitest tests for the pure helpers.                                                                                                                                                           |

## 2. How each feature works

**Search submit** — `main.ts` listens for `submit` on `#search-form` and calls
`event.preventDefault()` so the page does not reload. It trims the input with
`normalizeUsername`, checks it with `isValidUsername`, then calls `runSearch`.

**Fetching** — `runSearch` shows the loading state, awaits `searchUser(username)`
from `github.ts`, and passes the result to `render` in `ui.ts`.

**Handling every outcome** — `searchUser` catches errors and returns a
`SearchResult`. `render` has a `switch (result.kind)` with one branch per case.
Because `SearchResult` is a union, adding a new kind makes TypeScript complain
until you handle it in the UI.

**User not found** — `fetchUser` returns `null` for HTTP 404 (not an error, just
"no such user"). `searchUser` turns that into `{ kind: "notFound", username }`.

**Rate limit** — GitHub answers HTTP 403 when the 60 requests/hour are used up.
`fetchUser` throws `new Error("rate limited")` and `searchUser` maps that to the
`rateLimited` case.

**Repos** — a second request to `/users/:name/repos?sort=updated&per_page=5`.
If it fails, we return an empty array so the profile is still shown.

**URL sharing** — after a successful search, `history.replaceState` sets
`?user=name` without reloading. On load, `main.ts` reads that parameter and
searches automatically.

**Stale responses** — `latestSearch` counts searches. Each request remembers its
number, and when it finishes it compares it with the current one. If they differ,
the result is thrown away. Try searching "a" then quickly "b": "a" never replaces
"b".

**Safety** — user text like a bio is set with `textContent`, never `innerHTML`,
so a username cannot inject HTML. Links add `rel="noopener noreferrer"` because
they open in a new tab.

## 3. TypeScript used here

- **Interfaces** for API shapes: `interface GitHubUser { login: string; ... }`.
  Fields that GitHub can send as `null` are typed `string | null`, so the UI has
  to check before using them (`user.name ?? user.login`).
- **Union of object types**:

  ```ts
  type SearchResult =
    | { kind: "loading"; username: string }
    | { kind: "success"; user: GitHubUser; repos: GitHubRepo[] };
  // ...
  ```

  Each variant carries exactly the data it needs. TypeScript narrows the type
  inside each `case` of the `switch`.

- **Type guard**: `value is GitHubUser` tells TypeScript that after a `true`
  return, `value` can be treated as `GitHubUser`.
- **`unknown`** is what `response.json()` really gives you. We check it, we never
  cast it blindly.
- **`as` cast** in `ui.ts`'s `byId<T>`: `document.getElementById` returns
  `HTMLElement | null`. We check the null case and then tell TypeScript which
  element type we expect.
- **Generic function**: `function byId<T extends Element>(id: string): T` — the
  caller chooses the type: `byId<HTMLImageElement>("profile-avatar")`.
- **`void runSearch(...)`** — `runSearch` returns a Promise; `void` says "I am
  intentionally not waiting for it here".
- **Template literals with `encodeURIComponent`** when building API URLs, so a
  weird name cannot break the path.

## 4. Ten interview-style questions

**1. What is a closure, and where is one here?**
A function that remembers variables from where it was created. In `main.ts`,
`runSearch` closes over `latestSearch`, and the `submit` listener closes over
`form` and `input`.

**2. How does form submit with `preventDefault` work?**
Without it the browser would navigate/reload. `preventDefault()` stops that so
JavaScript controls what happens. Submitting with Enter and clicking the button
both fire `submit`, so one listener covers both.

**3. What is event delegation and does this project use it?**
One listener on a parent that handles events from its children, using bubbling.
This project does not need it — the repo list is rebuilt each search, so
listeners on links are added with the elements. If the list were appended to
incrementally with click handlers, delegation would be cleaner.

**4. What is the difference between `fetch` resolving and the HTTP status being OK?**
`fetch` only rejects on network failures. A 404 is a resolved response with
`response.ok === false`, which is why `fetchUser` checks `response.status`
explicitly.

**5. Why does `response.json()` return `Promise<unknown>` in a strict project?**
Because nobody can know the shape of remote JSON. Declaring it `Promise<GitHubUser>`
would be a lie; checking it with type guards is honest.

**6. Why write `?user=` into the URL?**
State in the URL survives refresh, can be bookmarked and shared, and works with
the back button if you used `pushState`. I used `replaceState` so each search
does not fill up history.

**7. What is a race condition in this app, and how does the counter fix it?**
Two searches in flight; the first can finish last and paint the wrong user. The
`latestSearch` counter lets each response check whether it is still the latest
one and drop itself if not. `AbortController` would cancel the request itself.

**8. Why are the helpers in `api.ts` pure functions?**
They take values and return values, no `fetch`, no DOM. That makes them easy to
test with Vitest without mocking anything.

**9. What does `??` do, and how is it different from `||`?**
`??` only falls back when the left side is `null` or `undefined`. `||` also
falls back on `""`, `0` and `false`, which would wrongly replace a real `0`
follower count with the fallback.

**10. How would you avoid the 60 requests per hour limit?**
Cache results for a few minutes (`sessionStorage` or a Map), avoid duplicate
requests, search on submit, and for a real app call the API from a small server
function that holds a token.

## 5. Reading order

1. Run it, search `octocat`, then search something that does not exist.
2. `index.html` — note the ids the code uses.
3. `src/types.ts` — the data shapes.
4. `src/api.ts` and `tests/api.test.ts` side by side, running `npm test`.
5. `src/github.ts` — the 404 / 403 / network cases.
6. `src/ui.ts` — the `switch`.
7. `src/main.ts` — only ~60 lines, read it twice: once for the submit flow, once
   for the `latestSearch` guard.
8. `src/style.css` — the variables and the mobile block.

## 6. Five exercises

1. **Show the GitHub search URL in the status bar** while loading, e.g.
   `Looking up octocat…` — done; now add the repo count to the success message.
2. **Load 10 repos instead of 5.** Change `per_page` in `reposUrl` and add a test
   that checks the URL string.
3. **Add a "Try again" button** to the rate-limit message that re-runs `runSearch`
   with the last username.
4. **Use `AbortController`:** keep the previous controller, abort it on a new
   search, and pass `{ signal }` to `fetch`. Handle `AbortError` without showing
   the network error message.
5. **Add repo topics.** Extend `GitHubRepo` with `topics: string[]`, add it to
   `isGitHubRepo` (careful: it is optional in the API), and show them as small
   labels in `createRepoCard`.
