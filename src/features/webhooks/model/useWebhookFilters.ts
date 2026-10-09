import { useSearchParams } from 'react-router';
import { useCallback, useMemo } from 'react';

export interface WebhookFilterState {
  page: number;
  search: string;
}

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseWebhookFilters(
  searchParams: URLSearchParams
): WebhookFilterState {
  return {
    page: parsePage(searchParams.get('page')),
    search: searchParams.get('search') ?? '',
  };
}

/** URL is the single source of truth for page and search. */
export function useWebhookFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<WebhookFilterState>(
    () => parseWebhookFilters(searchParams),
    [searchParams]
  );

  const setFilter = useCallback(
    (updates: Partial<WebhookFilterState>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        if (updates.search !== undefined) {
          if (updates.search) next.set('search', updates.search);
          else next.delete('search');
          next.delete('page');
        }

        if (updates.page !== undefined) {
          if (updates.page > 1) next.set('page', String(updates.page));
          else next.delete('page');
        }

        return next;
      });
    },
    [setSearchParams]
  );

  return { filters, setFilter };
}
