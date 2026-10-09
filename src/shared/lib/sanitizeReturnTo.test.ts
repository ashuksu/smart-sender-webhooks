import { describe, expect, it } from 'vitest';
import { sanitizeReturnTo } from './sanitizeReturnTo';

describe('sanitizeReturnTo', () => {
  it('keeps same-origin relative paths with query strings', () => {
    expect(sanitizeReturnTo('/webhooks?page=2&search=pay')).toBe(
      '/webhooks?page=2&search=pay'
    );
  });

  it.each([
    null,
    '',
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
  ])('falls back to /webhooks for unsafe value %j', (value) => {
    expect(sanitizeReturnTo(value)).toBe('/webhooks');
  });
});
