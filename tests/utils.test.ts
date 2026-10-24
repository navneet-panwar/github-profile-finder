import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addRecent, cleanRecent, debounce, formatCount } from "../src/utils";
import { canLoadMore, toRepos } from "../src/repos";
import { readRepoCount, toUser } from "../src/search";
import { isValidUsername, normalizeUsername } from "../src/api";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only calls the function once after a burst of calls", () => {
    const calls: string[] = [];
    const delayed = debounce((value: string) => calls.push(value), 300);

    delayed("o");
    delayed("oc");
    delayed("octa");
    delayed("octocat");

    expect(calls).toEqual([]);
    vi.advanceTimersByTime(299);
    expect(calls).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(calls).toEqual(["octocat"]);
  });
});

describe("formatCount", () => {
  it("keeps small numbers and shortens thousands", () => {
    expect(formatCount(7)).toBe("7");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1500)).toBe("1.5k");
    expect(formatCount(25000)).toBe("25k");
  });
});

describe("addRecent", () => {
  it("puts the newest first, removes duplicates and keeps five", () => {
    let list: string[] = [];
    for (const name of ["a", "b", "c", "d", "e", "f"]) {
      list = addRecent(list, name);
    }
    expect(list).toEqual(["f", "e", "d", "c", "b"]);

    // Searching "C" again moves it to the front instead of adding a copy.
    list = addRecent(list, "C");
    expect(list).toEqual(["c", "f", "e", "d", "b"]);
  });
});

describe("cleanRecent", () => {
  it("returns an empty list for anything that is not an array", () => {
    expect(cleanRecent(null)).toEqual([]);
    expect(cleanRecent("octocat")).toEqual([]);
    expect(cleanRecent({ user: "octocat" })).toEqual([]);
  });

  it("drops non-strings, blanks and duplicates", () => {
    expect(cleanRecent(["a", 5, "   ", "a", "b", null])).toEqual(["a", "b"]);
  });
});

describe("isValidUsername", () => {
  it("accepts real names and rejects bad ones", () => {
    expect(isValidUsername("octocat")).toBe(true);
    expect(isValidUsername("  some-user  ")).toBe(true);
    expect(isValidUsername("two words")).toBe(false);
    expect(isValidUsername("-start")).toBe(false);
    expect(isValidUsername("a--b")).toBe(false);
    expect(normalizeUsername(" @octocat ")).toBe("octocat");
  });
});

describe("GitHub data", () => {
  it("reads the total page count out of the Link header", () => {
    const link = '<https://api.github.com/user/1/repos?per_page=6&page=2>; rel="next", '
      + '<https://api.github.com/user/1/repos?per_page=6&page=14>; rel="last"';
    expect(readRepoCount(link)).toBe(14);
    expect(readRepoCount(null)).toBeNull();
    expect(readRepoCount("something else")).toBeNull();
  });

  it("turns raw API JSON into our own shape, or rejects it", () => {
    const user = toUser({
      login: "octocat",
      name: null,
      avatar_url: "https://example.com/a.png",
      html_url: "https://github.com/octocat",
      bio: null,
      public_repos: 8,
      followers: 20000,
      following: 9
    });
    expect(user?.repos).toBe(8);
    expect(user?.name).toBe("");
    expect(toUser({ login: "no-avatar" })).toBeNull();
  });

  it("keeps only valid repos and cleans empty fields", () => {
    const repos = toRepos([
      {
        id: 1,
        name: "hello",
        description: null,
        language: "Go",
        stargazers_count: 3,
        html_url: "https://github.com/octocat/hello"
      },
      { name: "broken" }
    ]);
    expect(repos).toHaveLength(1);
    expect(repos[0]?.description).toBe("");
    expect(repos[0]?.language).toBe("Go");

    expect(toRepos(null)).toEqual([]);
  });

  it("only offers more pages after a full page", () => {
    expect(canLoadMore(1, 6)).toBe(true);
    expect(canLoadMore(1, 4)).toBe(false);
    expect(canLoadMore(5, 6)).toBe(false);
  });
});
