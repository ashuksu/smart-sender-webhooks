import { describe, expect, it } from 'vitest';
import { parseWebhookFilters } from './useWebhookFilters';

describe('parseWebhookFilters', () => {
  it('uses default filters when URL is empty', () => {
    expect(parseWebhookFilters(new URLSearchParams())).toEqual({
      page: 1,
      search: '',
    });
  });

  it('reads search and page from URL', () => {
    expect(
      parseWebhookFilters(new URLSearchParams('search=payments&page=3'))
    ).toEqual({
      page: 3,
      search: 'payments',
    });
  });

  it.each(['0', '-1', 'abc', ''])(
    'falls back to page 1 for invalid page "%s"',
    (page) => {
      expect(
        parseWebhookFilters(new URLSearchParams(`page=${page}`)).page
      ).toBe(1);
    }
  );

  it('preserves search text from URL', () => {
    expect(
      parseWebhookFilters(new URLSearchParams('search=Payment%20Hook')).search
    ).toBe('Payment Hook');
  });
});
