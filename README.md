# GitHub Profile Finder

A small page where you type a GitHub username and get their profile plus their
five most recently updated public repositories. No login, no build-time secrets,
just the public GitHub API.

I made this to practise `fetch` with TypeScript: how to handle loading, a missing
user, a bad username and API errors without crashing.

## Features

- Search a username (button or Enter key)
- Profile card: avatar, name, bio, location, company, website, join date,
  number of repos, followers and following
- The five latest public repositories with language, stars and forks
- Clear messages for: empty input, invalid username, user not found,
  rate limit reached, and network problems
- The searched user is written to the URL (`?user=name`) so you can refresh or
  share the link
- Responsive layout and light/dark theme from `prefers-color-scheme`
- Keyboard friendly inputs and links with visible focus outlines

## How to run

```bash
npm install
npm run dev      # http://localhost:5173
```

## Tests

```bash
npm test         # Vitest
npm run build    # type-check + production build into dist/
```

The tests cover the pure helpers in `src/api.ts`: username validation and
normalising, number formatting, date formatting and filtering the repo list.

## Deploying

1. Push the folder to GitHub.
2. On Vercel: "Add New Project" → import the repo.
3. It reads `vercel.json`, runs `npm run build` and serves `dist/`.
4. Deploy.

## Folder structure

```
index.html    page skeleton with all the ids
src/
  types.ts    GitHubUser, GitHubRepo and the SearchResult union
  api.ts      username checks, URL building, JSON checks, small formatters
  github.ts   the two fetch functions and searchUser()
  ui.ts       fills the profile card and the repo list
  main.ts     form submit, loading state, "latest search wins" guard
  style.css   all the styles
tests/
  api.test.ts tests for the pure helpers
```

## Decisions I made

- **No token, no proxy.** The public API allows 60 requests per hour per IP.
  That is enough for a demo; the page tells the user when it runs out.
- **Two requests per search** (user + repos) instead of one GraphQL call, because
  REST is simpler to read and does not need a token.
- **If the repo request fails, the profile still shows.** The repo list is empty
  rather than the whole page failing.
- **The input is checked before fetching.** GitHub usernames are letters, digits
  and single hyphens, so an obviously wrong input gets an instant message.
- **Search is on submit only**, not on every keystroke, so typing "octocat" does
  not send nine requests.
- **No saved recent searches.** I kept it to one screen of output.

## What I learned

- How to type `fetch` responses: `fetch` gives `unknown` data, so I wrote small
  check functions (`isGitHubUser`, `isGitHubRepo`) instead of trusting the JSON.
- Why a union type like `SearchResult` is handy for UI state: a `switch` makes
  TypeScript tell me if I forgot a case.
- How to stop an older, slower response from overwriting a newer search
  (`latestSearch` counter in `main.ts`).

## What I'd improve

- Cache recent searches in `localStorage` and show them as chips.
- Add a "load more" button for repositories.
- Show a skeleton card while loading instead of only text.
- Use `AbortController` to actually cancel outdated requests.
