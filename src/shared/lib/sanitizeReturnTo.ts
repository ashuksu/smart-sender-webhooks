const DEFAULT_RETURN_PATH = '/webhooks';

// URL parsers normalize backslashes to slashes and strip tabs/newlines,
// so "/\evil.com" or "/\t/evil.com" would resolve to another host.
const UNSAFE_CHARS = /[\\\t\n\r]/;

/**
 * Allows only same-origin relative paths (e.g. '/webhooks?page=2').
 * Anything that could resolve to another origin falls back to the default.
 */
export function sanitizeReturnTo(url: string | null): string {
  if (!url) return DEFAULT_RETURN_PATH;
  if (!url.startsWith('/') || url.startsWith('//')) return DEFAULT_RETURN_PATH;
  if (UNSAFE_CHARS.test(url)) return DEFAULT_RETURN_PATH;
  return url;
}
