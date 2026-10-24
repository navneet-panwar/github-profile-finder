// Our own checks for usernames. Separate from the API files so they are easy to test.

// GitHub usernames: letters, digits and single hyphens, up to 39 characters.
const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value.trim());
}

// " @octocat " becomes "octocat".
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "");
}
