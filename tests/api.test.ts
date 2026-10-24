import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatJoined,
  isValidUsername,
  normalizeUsername,
  parseRepoList
} from "../src/api";

describe("isValidUsername", () => {
  it("accepts normal usernames, with or without surrounding spaces", () => {
    expect(isValidUsername("octocat")).toBe(true);
    expect(isValidUsername("  some-user ")).toBe(true);
    expect(isValidUsername("a")).toBe(true);
  });

  it("rejects names with spaces, symbols, or a hyphen at the edge", () => {
    expect(isValidUsername("")).toBe(false);
    expect(isValidUsername("two words")).toBe(false);
    expect(isValidUsername("-leading")).toBe(false);
    expect(isValidUsername("trailing-")).toBe(false);
    expect(isValidUsername("double--hyphen")).toBe(false);
    expect(isValidUsername("with_underscore")).toBe(false);
  });

  it("normalizes the @ prefix and trims spaces", () => {
    expect(normalizeUsername(" @octocat ")).toBe("octocat");
  });
});

describe("formatCount", () => {
  it("leaves small numbers alone and shortens big ones", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1500)).toBe("1.5k");
    expect(formatCount(12300)).toBe("12k");
  });
});

describe("formatJoined", () => {
  it("returns a month and year", () => {
    expect(formatJoined("2020-05-14T08:30:00Z")).toContain("2020");
    expect(formatJoined("not a date")).toBe("");
  });
});

describe("parseRepoList", () => {
  it("returns an empty array when GitHub does not send a list", () => {
    expect(parseRepoList(null)).toEqual([]);
    expect(parseRepoList({ message: "Bad credentials" })).toEqual([]);
  });

  it("keeps only the items that look like repositories", () => {
    const good = {
      id: 1,
      name: "hello-world",
      html_url: "https://github.com/octocat/hello-world",
      stargazers_count: 5,
      forks_count: 2,
      updated_at: "2026-01-01T00:00:00Z"
    };
    const result = parseRepoList([good, { name: "broken" }]);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("hello-world");
  });
});
