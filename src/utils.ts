// Small helpers. These are pure functions, so they are easy to test.

// Runs `fn` only after `wait` ms with no new calls.
// Typing "octocat" ends up as one call, not seven.
// It works thanks to a closure: every call keeps using the same `timer` variable,
// so clearTimeout can cancel the previous timer.
export function debounce<T>(fn: (value: T) => void, wait: number): (value: T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (value: T): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(value);
    }, wait);
  };
}

// 0 -> "0", 950 -> "950", 1500 -> "1.5k", 24000 -> "24k"
export function formatCount(count: number): string {
  if (count < 1000) {
    return String(count);
  }
  const thousands = count / 1000;
  const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return `${rounded}k`;
}

export const MAX_RECENT = 5;

// Adds a search to the top of the list. Newest first, no duplicates,
// and only MAX_RECENT items. Comparing lowercase means "Octocat" and
// "octocat" count as the same person.
export function addRecent(recent: string[], username: string): string[] {
  const name = username.trim().toLowerCase();
  if (name === "") {
    return recent;
  }
  const withoutCopy = recent.filter((item) => item !== name);
  return [name, ...withoutCopy].slice(0, MAX_RECENT);
}

// Used when reading the list back from localStorage: anything that is not a
// non-empty string is removed, and so are duplicates.
export function cleanRecent(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const names = value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
  return [...new Set(names)].slice(0, MAX_RECENT);
}
