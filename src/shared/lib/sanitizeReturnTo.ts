/**
 * Sanitizes returnTo parameter to prevent Open Redirect vulnerabilities.
 * Only allows relative paths starting with a single '/' (e.g., '/webhooks', not '//evil.com').
 */
export function sanitizeReturnTo(url: string | null): string {
  if (!url) return '/webhooks';
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  return '/webhooks';
}
