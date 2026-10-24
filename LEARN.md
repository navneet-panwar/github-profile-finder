# LEARN.md — studying GitFinder

## 1. Map of the project

| File                  | What it does                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`          | The page markup: title, search input, recent searches, status line, profile card, repo list and "Load more" button. The code finds elements by their ids.       |
| `src/elements.ts`     | Looks up every element once (`document.querySelector`) with the right type, and throws an error if one is missing. The rest of the app imports `els` from here. |
| `src/types.ts`        | `GitHubUser` and `GitHubRepo` (our clean version of the data) and the `SearchResult` union.                                                                     |
| `src/api.ts`          | `isValidUsername` and `normalizeUsername` — pure string checks, no network.                                                                                     |
| `src/utils.ts`        | Pure helpers: `debounce`, `formatCount`, `addRecent`, `cleanRecent`.                                                                                            |
| `src/search.ts`       | `findUser(input)`: checks the name, calls the API with `fetch`, turns the raw JSON into a `GitHubUser`, and turns every failure into a `SearchResult`.          |
| `src/repos.ts`        | `fetchRepos(username, page)`, `canLoadMore`, `toRepos` — one page of six repos.                                                                                 |
| `src/storage.ts`      | `loadRecent` / `saveRecent` — localStorage, safe against broken data.                                                                                           |
| `src/ui.ts`           | Everything that draws: `showLoading`, `showError`, `showEmptyState`, `showProfile`, `appendRepos`, `setLoadMore`, `showNoRepos`, `createRepoCard`.              |
| `src/main.ts`         | The app state and the event wiring: input typing, Enter, Load more, recent chips, Clear, `?user=`.                                                              |
| `src/style.css`       | CSS variables for light/dark, layout, focus styles, the phone layout.                                                                                           |
| `tests/utils.test.ts` | Vitest tests for debounce, formatting, recent searches, username checks and the data helpers.                                                                   |

## 2. How each feature works

### fetch, promises and `async/await`

`fetch(url)` does not give you data. It gives you a **promise**: a box that will
hold the answer later. A promise has three states: pending, fulfilled, rejected.
`await` "pauses" the current async function until the promise settles — the rest
of the page keeps running meanwhile.

In `src/search.ts`, `requestUser` is an `async` function. Every `await` inside it
waits for the next step: `await fetch(...)` waits for the headers, then
`await response.json()` waits for the body. The function itself always returns a
promise, which is why `findUser` can `return await requestUser(...)`.

Important: **`fetch` only rejects when the network fails.** A 404 or a 403 is a
successful response with `response.ok === false`. That is why the status codes
are checked by hand.

```ts
if (response.status === 404) return { status: "notFound", username };
if (response.status === 403) throw new Error("rate limit");
if (!response.ok) throw new Error("request failed");
```

### try/catch and the `SearchResult` union

`findUser` wraps the request in `try { ... } catch (error) { ... }`. Anything
thrown inside `try` jumps to `catch`, where we look at `error.message` and return
either `{ status: "rateLimited" }` or `{ status: "error" }`. Nothing is thrown out
of `findUser`, so `main.ts` never needs its own try/catch.

The union in `src/types.ts` lists every possible result:

```ts
type SearchResult =
  | { status: "idle" }
  | { status: "loading"; username: string }
  | { status: "success"; user: GitHubUser; repoCount: number | null }
  | { status: "notFound"; username: string }
  | { status: "rateLimited" }
  | { status: "error" }
  | { status: "invalid" };
```

Only some of them have `user` or `username`. TypeScript only lets you read those
fields in the `if`/`switch` branch that proves which one you have.

### Loading, error and empty states (`src/ui.ts`)

- **Loading**: `showLoading(username)` clears the old results and writes
  "Looking up octocat…" into `#status-message`. That element has
  `role="status" aria-live="polite"`, so screen readers say it out loud.
- **Error**: `showError(result)` switches on `result.status` and writes the right
  sentence (not found / rate limit / invalid name / network), then adds
  `data-tone="error"` so CSS colours it red.
- **Empty**: `showEmptyState()` when the box is empty, and `showNoRepos()` when a
  user exists but has no public repositories.
- All of them call `hideResults()` first, so you never see a profile from the
  previous search under a new error.

### Debounce (`src/utils.ts`) — a closure example

```ts
export function debounce<T>(
  fn: (value: T) => void,
  wait: number,
): (value: T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (value: T): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => fn(value), wait);
  };
}
```

`debounce` returns a **new function**. That function remembers `timer` because of
a **closure**: the outer function has already finished, but the inner function
still has access to its variables. Imagine a coach holding a whistle: every time
a player types, the coach resets the stopwatch; the whistle only blows when
there has been 500 ms of silence.

In `main.ts` we create it once:

```ts
const searchLater = debounce((value: string) => { ... }, 500);
```

and call `searchLater(searchInput.value)` on every `input` event. Typing
"octocat" therefore sends **one** request, not seven (which matters when the API
allows 60 an hour). Pressing Enter calls `search()` directly and skips the wait.

### Username checks (`src/api.ts`)

`normalizeUsername` trims spaces and drops a leading `@`. `isValidUsername` tests
a regex: letters, digits and single hyphens, so `"bad user!"` is answered
instantly without a request.

### Typing the API data (`src/search.ts`, `src/repos.ts`)

`response.json()` returns `unknown`. `toUser` checks each field
(`typeof data.login !== "string"` and so on) and returns `GitHubUser | null`.
GitHub uses `null` for empty text, so `text()` turns that into `""`. The page
then only handles simple strings — no `null` checks everywhere.

### Repositories and Load more (`src/repos.ts`, `src/main.ts`)

`fetchRepos(username, page)` asks for `<url>?sort=updated&per_page=6&page=N`.
`loadPage` keeps two variables: `loadedRepos` (total shown) and `nextPage`.
A full page (6 repos) means there might be more, so `canLoadMore` keeps the
button visible; fewer than 6 means that was the last page. We also stop after
`MAX_PAGES = 5` pages to be gentle with the free API.

### Recent searches (`src/utils.ts`, `src/storage.ts`)

- `addRecent` puts the new name first, removes an older copy (same lowercase
  name) and keeps only 5.
- `loadRecent` wraps `JSON.parse` in `try/catch`; anything that is not an array
  becomes `[]`.
- `saveRecent` also has `try/catch`, because storage can be full or blocked in
  private mode.
- Clicking a chip fills the input and runs `search()` immediately.

### Stale responses

Search "a", then quickly "b". If "a" answers last, the page would show the wrong
person. `searchNumber` is incremented at the start of every `search()`, and each
call keeps its own copy (`thisSearch`). When it comes back, `if (thisSearch !==
searchNumber) return;` throws the old answer away. The repo loader does the same
by comparing `login !== currentLogin`.

## 3. TypeScript syntax used here

- **`interface`** — the shape of an object: `interface GitHubRepo { name: string; stars: number }`.
- **Union type** — a value is one of a few options: `"hidden" | "ready" | "loading"`.
- **Discriminated union** — a union of objects that each have a `status` field, so
  TypeScript can tell them apart in an `if`/`switch`.
- **`unknown` vs `any`** — `unknown` means "check before use". We never use `any`.
- **Narrowing** — after `if (typeof value !== "object" || value === null) return null;`,
  TypeScript knows `value` is a real object.
- **Type predicate / cast** — `value as Record<string, unknown>` is a promise to
  TypeScript ("I checked it, it is an object"), used only right after a check.
- **Generic function** — `function element<T extends HTMLElement>(...)` — the
  caller picks the element type, so `.src` works only on an `<img>`.
- **`type` export** — `import { findUser, type SearchResult }` imports the value
  and the type from one module.
- **`ReturnType<typeof setTimeout>`** — the browser returns a number, Node returns
  a Timeout object. This type works in both.
- **`null` in a type** — `repoCount: number | null` means GitHub may not tell us
  the total.
- **`void`** — `void search(name)` starts an async function but says "I am not
  waiting for the result here".

## 4. Ten interview-style questions

**1. What is a promise?**
An object that represents a value that will exist later. It is pending, then
fulfilled (with a value) or rejected (with an error). `await` pauses an async
function until it settles.

**2. What does `async` do to a function?**
It wraps the return value in a promise, allows `await` inside, and turns a thrown
error into a rejected promise instead of a hard crash.

**3. Why does `fetch` not reject on a 404?**
Because a 404 is a real HTTP answer — the server is fine, the URL just does not
exist. `fetch` only rejects when the request itself fails (no connection, DNS
error, CORS). That is why `response.ok` / `response.status` must be checked.

**4. Explain a closure, using debounce.**
A closure is a function that keeps access to variables from the scope where it
was defined. `debounce`'s returned function keeps using `timer`, which lives
outside it, so each call can clear the previous timer.

**5. Why debounce instead of searching on every keystroke?**
Each keystroke would be a request: slower, wasteful, and it hits the rate limit
fast. Debounce waits until the user pauses, so one search is sent.

**6. What is the difference between the call stack, the task queue and the microtask queue?**
The call stack runs synchronous code. Promises (and `await` continuations) go to
the microtask queue, which drains before the task queue, where `setTimeout` and
DOM events live. That is why an `await` resumes before a `setTimeout(0)`.

**7. What is a race condition here, and how is it avoided?**
Two searches in flight; the older one may finish last and overwrite the newer
one. The `searchNumber` counter makes every response check it is still the latest.

**8. Why is `response.json()` typed `Promise<unknown>`?**
JSON from a server has no type information, so any type would be a guess. `unknown`
forces a check, which is exactly what `toUser` and `toRepos` do.

**9. Why `try/catch` around `JSON.parse` and `localStorage`?**
Both throw on bad input — broken JSON text or blocked storage. Without the catch
the whole script would stop and the page would be blank.

**10. What does `aria-live="polite"` do?**
It tells screen readers to announce changes to that element when the user is
idle. Combined with `role="status"`, "Looking up octocat…" and error messages are
spoken without stealing focus.

## 5. Suggested reading order

1. Run it (`npm run dev`) and type `octocat` slowly, then delete it, then type
   something that does not exist.
2. `index.html` — the ids and the empty containers.
3. `src/types.ts` — the shapes and the union.
4. `src/utils.ts` with `tests/utils.test.ts` — run `npm test` and match tests to
   functions.
5. `src/api.ts` — two small string functions.
6. `src/search.ts` — the request, the status checks and `toUser`.
7. `src/repos.ts` — the paging rule.
8. `src/ui.ts` — all the state functions.
9. `src/main.ts` — the last one, because every name is now familiar.
10. `src/style.css` — the variables at the top and the media queries at the bottom.

## 6. Five exercises

1. **Change the debounce delay** in `main.ts` to 250 ms and to 1000 ms and
   compare the feel. Then remove the Enter shortcut and notice why it exists.
2. **Load 10 repos per page.** Change `PER_PAGE` in `src/repos.ts`, then fix the
   test that uses 6 in `tests/utils.test.ts`.
3. **Add a "Try again" button** next to the rate-limit message in `showError`.
   It should call `search()` again with the last username (store it in a
   variable in `main.ts`).
4. **Improve recent searches**: show the newest one with an "(latest)" label by
   editing `renderRecent` in `main.ts` only.
5. **Cancel old requests.** Create an `AbortController` before each search, pass
   `{ signal }` to `fetch`, and call `controller.abort()` when a newer search
   starts. Treat `AbortError` as "ignore", not as a network error.
