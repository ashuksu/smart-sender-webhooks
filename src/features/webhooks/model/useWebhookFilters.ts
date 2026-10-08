import { useSearchParams } from 'react-router';
import { useCallback, useMemo } from 'react';

export interface WebhookFilterState {
  page: number;
  search: string;
  status: 'all' | 'active' | 'inactive';
}

export function useWebhookFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<WebhookFilterState>(() => {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const search = searchParams.get('search') || '';
    const statusParam = searchParams.get('status');
    const status =
      statusParam === 'active' || statusParam === 'inactive'
        ? statusParam
        : 'all';

    return { page, search, status };
  }, [searchParams]);

  const setFilter = useCallback(
    (updates: Partial<WebhookFilterState>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (updates.page !== undefined) {
            if (updates.page <= 1) next.delete('page');
            else next.set('page', String(updates.page));
          }

          if (updates.search !== undefined) {
            if (!updates.search) next.delete('search');
            else next.set('search', updates.search);
            // При изменении поиска сбрасываем страницу на 1
            if (updates.page === undefined) next.delete('page');
          }

          if (updates.status !== undefined) {
            if (updates.status === 'all') next.delete('status');
            else next.set('status', updates.status);
            if (updates.page === undefined) next.delete('page');
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return { filters, setFilter, resetFilters };
}
