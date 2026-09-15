/**
 * URL-safe names.
 *
 * Public URLs use a slug plus a short suffix rather than a raw UUID: a link
 * someone pastes into Slack should say what it is, and a UUID in a URL leaks a
 * database id for nothing in return. The suffix keeps two projects with the
 * same name from colliding without a round trip to check.
 */

const MAX_SLUG_LENGTH = 60;

export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    // Strip combining marks so "Café" becomes "cafe", not "caf".
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "project";
}

/** Four characters of base36 — enough to separate names, short enough to read. */
export function slugSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export function uniqueSlug(name: string): string {
  return `${slugify(name)}-${slugSuffix()}`;
}

/**
 * A share token.
 *
 * The token is the only secret protecting a shared project, so it comes from
 * the platform CSPRNG — 160 bits, URL-safe, never derived from the project id.
 */
export function createShareToken(): string {
  const bytes = new Uint8Array(20);

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    // Only reachable in a non-browser test context; never on a real share.
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
