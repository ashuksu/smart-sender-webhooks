import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { Webhook } from '@/shared/api/contract';
import { useWebhookFilters } from '../model/useWebhookFilters';
import {
  useWebhookMutations,
  useWebhooksQuery,
} from '../model/useWebhooksQuery';

export function WebhooksListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilter, resetFilters } = useWebhookFilters();
  const { data, isLoading, isError, error, refetch } =
    useWebhooksQuery(filters);
  const { toggleWebhook, deleteWebhook, pingWebhook, isToggling } =
    useWebhookMutations();

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

  const [pingResult, setPingResult] = useState<{
    id: number;
    msg: string;
  } | null>(null);

  const handlePing = async (id: number) => {
    try {
      const res = await pingWebhook(id);
      setPingResult({ id, msg: `Success (${res.latency_ms}ms)` });
      setTimeout(() => setPingResult(null), 3000);
    } catch {
      setPingResult({ id, msg: 'Ping failed' });
      setTimeout(() => setPingResult(null), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      await deleteWebhook(id);
    }
  };

  const totalPages = data?.paging?.pages?.last ?? 1;
  const currentPage = data?.paging?.pages?.current ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhook Endpoints</h1>
          <p className="text-sm text-slate-400">
            Manage and monitor your integration webhooks
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <input
            type="text"
            placeholder="Search by name or URL..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-full sm:w-72 text-sm"
          />

          <select
            value={filters.status}
            onChange={(e) =>
              setFilter({
                status: e.target.value as 'all' | 'active' | 'inactive',
              })
            }
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-sky-500 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {(filters.search || filters.status !== 'all') && (
            <button
              onClick={() => {
                setSearchInput('');
                resetFilters();
              }}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-400 bg-slate-800 rounded-xl border border-slate-700">
          Loading webhooks...
        </div>
      ) : isError ? (
        <div className="p-6 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 flex items-center justify-between">
          <span>
            Failed to load webhooks:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </span>
          <button
            onClick={() => void refetch()}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-400"
          >
            Retry
          </button>
        </div>
      ) : !data?.data?.length ? (
        <div className="p-12 text-center bg-slate-800 rounded-xl border border-slate-700 space-y-3">
          <p className="text-slate-400 text-lg">No webhooks found</p>
          <p className="text-slate-500 text-sm">
            Try adjusting your search or status filter
          </p>
          {currentPage > 1 && (
            <div className="pt-2">
              <button
                onClick={() => setFilter({ page: 1 })}
                className="px-4 py-2 text-sm bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg transition"
              >
                Reset to page 1
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    Name / URL
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {data.data.map((item: Webhook) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-700/30 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-xs">
                        {item.url}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        disabled={isToggling}
                        onClick={() =>
                          void toggleWebhook({
                            id: item.id,
                            active: !item.active,
                          })
                        }
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                          item.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {item.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {pingResult !== null && pingResult.id === item.id && (
                        <span className="text-xs text-sky-400 mr-2">
                          {pingResult.msg}
                        </span>
                      )}
                      <button
                        onClick={() => void handlePing(item.id)}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded text-white transition"
                      >
                        Ping
                      </button>
                      <button
                        onClick={() =>
                          void navigate(`/webhooks/${item.id}`, {
                            state: { from: location.search },
                          })
                        }
                        className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(item.id)}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded transition"
                      >
                        Delete
                      </button>
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
                Page <strong className="text-white">{currentPage}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setFilter({ page: currentPage - 1 })}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs transition"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilter({ page: currentPage + 1 })}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs transition"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
