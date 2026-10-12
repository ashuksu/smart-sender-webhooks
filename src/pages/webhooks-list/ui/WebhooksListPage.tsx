import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useWebhookFilters } from '@/features/webhooks/model/useWebhookFilters';
import { useWebhooksQuery } from '@/features/webhooks/model/useWebhooksQuery';
import { useTranslation } from 'react-i18next';

export function WebhooksListPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { filters, setFilter } = useWebhookFilters();
  const { data, isLoading, isError, isPlaceholderData, error, refetch } =
    useWebhooksQuery(filters);

  const [prevSearch, setPrevSearch] = useState(filters.search);
  const [searchInput, setSearchInput] = useState(filters.search);

  if (prevSearch !== filters.search) {
    setPrevSearch(filters.search);
    setSearchInput(filters.search);
  }

  useEffect(() => {
    if (searchInput === filters.search) return;
    const timer = setTimeout(() => {
      setFilter({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, setFilter]);

  const totalPages = data?.paging.pages.last ?? 1;
  const currentPage = data?.paging.pages.current ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {t('webhooksList.title')}
        </h1>
        <p className="text-sm text-slate-400">{t('webhooksList.subtitle')}</p>
      </div>

      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex gap-3 items-center">
        <input
          type="search"
          aria-label={t('webhooksList.searchPlaceholder')}
          placeholder={t('webhooksList.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full sm:w-72 text-sm"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => setFilter({ search: '' })}
            className="px-3 py-2 text-sm text-slate-400 hover:text-white transition"
          >
            {t('webhooksList.clearSearch')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 bg-slate-800 rounded-xl border border-slate-700">
          {t('webhooksList.loadingList')}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="p-6 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center justify-between"
        >
          <span>
            {t('webhooksList.loadError')}{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </span>
          <button
            onClick={() => void refetch()}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-400"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : !data?.data.length ? (
        <div className="p-12 text-center bg-slate-800 rounded-xl border border-slate-700 space-y-3">
          <p className="text-slate-400 text-lg">
            {t('webhooksList.noWebhooks')}
          </p>
          <p className="text-slate-500 text-sm">
            {t('webhooksList.noWebhooksHint')}
          </p>
          {currentPage > 1 && (
            <div className="pt-2">
              <button
                onClick={() => setFilter({ page: 1 })}
                className="px-4 py-2 text-sm bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg transition"
              >
                {t('webhooksList.resetToPage1')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden transition-opacity ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    {t('webhooksList.table.name')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('webhooksList.table.url')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('webhooksList.table.status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    <span className="sr-only">
                      {t('webhooksList.table.actions')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {data.data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-700/30 transition"
                  >
                    <td className="px-6 py-4 font-semibold text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span
                        className="block truncate font-mono text-xs text-slate-400"
                        title={item.url}
                      >
                        {item.url}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {item.active
                          ? t('common.active')
                          : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/webhooks/${item.id}`}
                        state={{ from: location.search }}
                        className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs rounded transition"
                      >
                        {t('common.edit')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="px-6 py-4 bg-slate-900/40 border-t border-slate-700 flex items-center justify-between text-sm"
            >
              <span className="text-slate-400">
                {t('webhooksList.pagination.page')}{' '}
                <strong className="text-white">{currentPage}</strong>{' '}
                {t('webhooksList.pagination.of')}{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setFilter({ page: currentPage - 1 })}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs transition"
                >
                  {t('common.previous')}
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilter({ page: currentPage + 1 })}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs transition"
                >
                  {t('common.next')}
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
