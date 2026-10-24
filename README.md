# GitFinder

A small page that looks up a GitHub user and shows their profile and
repositories. No login and no API key, just the public GitHub REST API.

I built it to practise TypeScript with the DOM: `fetch`, `async/await`, typing
data that comes from a server, and showing loading, error and empty states
properly.

## Features

- Search by username, **debounced** by 500 ms (a small hand-written helper in
  `src/utils.ts`). Pressing Enter searches straight away.
- Profile card: avatar, name, bio, public repo count, followers, following and a
  link to the profile on GitHub.
- Repositories (name, description, language, stars), **6 at a time**, with a
  "Load more" button.
- Loading, error (not found / network / rate limit / invalid name) and empty
  states, announced through an `aria-live` region.
- Recent searches in `localStorage` (max 5, newest first, no duplicates) that you
  can click again or clear.
- Responsive layout, light/dark mode via `prefers-color-scheme`, visible focus
  styles, labelled search input, alt text on the avatar.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

## Tests and build

```bash
npm test         # Vitest, 10 tests
npm run build    # type-check with tsc, then build to dist/
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On Vercel, add a new project and import that repository.
3. Vercel reads `vercel.json`, runs `npm run build` and serves `dist/`.
4. Deploy.

## Folder structure

```
index.html      page markup with the ids the code uses
src/
  main.ts       app state, search, load more, recent searches
  elements.ts   looks up all the elements once, with types
  ui.ts         everything that draws on the page
  types.ts      GitHubUser, GitHubRepo and the SearchResult union
  search.ts     findUser(): username -> user profile, with try/catch
  repos.ts      fetchRepos(): one page of 6 repos
  api.ts        username validation and normalising
  utils.ts      debounce, formatCount, addRecent, cleanRecent
  storage.ts    reading and writing recent searches in localStorage
  style.css     all the styles
tests/
  utils.test.ts tests for the pure helpers in utils.ts, repos.ts and search.ts
```

## Decisions I made

- **The free API allows 60 requests an hour per network.** A search costs two
  requests (user + first page of repos), so I stop "Load more" after 5 pages
  rather than quietly burning the limit.
- **One request per page of repositories.** GitHub has no "all repos" call, so
  pagination is the natural way to do it.
- **Invalid usernames never reach GitHub.** The regex in `api.ts` rejects them
  locally with a message.
- **Old responses are ignored.** A counter in `main.ts` (`searchNumber`) makes
  sure a slow answer to an older search cannot replace a newer one.
- **Recent searches are lowercased.** "Octocat" and "octocat" are the same user,
  so they should not take two slots.
- **The whole page starts hidden** (`<html hidden>`) and is revealed by the first
  render. Without that, elements with `hidden` in the HTML can flash on screen
  when the script sets them to `false`.

## What I learned

- How `fetch` works with promises: it only rejects when the network fails, so
  status codes like 404 have to be checked by hand.
- How debounce works, and why it needs a closure (each call shares the same
  timer variable so it can be cancelled).
- Why API data is `unknown` until you check it, and how to turn it into my own
  interfaces.
- How to keep the page honest while requests are in flight: a loading line, then
  either the profile or one clear error.

## What I'd improve

- Cache results for a few minutes so going back to a profile does not use a request.
- Use `AbortController` to cancel the request that is no longer needed.
- Show the total number of repositories next to "Load more" (the `Link` header
  already contains it).
