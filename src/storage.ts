import { MAX_RECENT } from "./utils";

const STORAGE_KEY = "gitfinder.recent";

// Reading can fail (storage turned off) or hold old/broken data,
// so this never throws and always returns a clean list.
export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecent(recent: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Full or blocked storage: the page still works without recent searches.
  }
}
