import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Webhook } from '@/shared/api/contract';
import { isApiError } from '@/shared/api/errors';
import { applyServerErrors } from '@/shared/lib/applyServerErrors';
import {
  useUpdateWebhook,
  useWebhookDetailQuery,
} from '@/features/webhooks/model/useWebhooksQuery';

const webhookSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .refine((val) => {
      try {
        const { protocol } = new URL(val);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL must be a valid HTTP or HTTPS address'),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

const inputClass =
  'w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 aria-[invalid=true]:border-red-500 text-sm';
const labelClass =
  'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1';

/** Reads the list query string (e.g. "?page=2") passed by the list page via router state. */
function getBackSearch(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    state.from.startsWith('?')
  ) {
    return state.from;
  }
  return '';
}

export function WebhookEditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const backSearch = getBackSearch(location.state);
  const backUrl = `/webhooks${backSearch}`;
  const { data: webhook, isLoading, error } = useWebhookDetailQuery(Number(id));

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading webhook details...
      </div>
    );
  }

  if (!webhook) {
    // Invalid id (query disabled) and 404 are both "not found"
    const notFound = !error || (isApiError(error) && error.status === 404);
    return (
      <div
        role="alert"
        className="p-6 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 space-y-3"
      >
        <p>
          {notFound
            ? 'Webhook not found.'
            : `Error loading webhook: ${error?.message ?? 'Unknown error'}`}
        </p>
        <Link to={backUrl} className="text-sky-400 hover:underline text-sm">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <WebhookEditForm key={webhook.id} webhook={webhook} backUrl={backUrl} />
  );
}

function WebhookEditForm({
  webhook,
  backUrl,
}: {
  webhook: Webhook;
  backUrl: string;
}) {
  const navigate = useNavigate();
  const { mutateAsync: update } = useUpdateWebhook(webhook.id);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { name: webhook.name, url: webhook.url },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update(values);
      void navigate(backUrl);
    } catch (error) {
      applyServerErrors(error, setError, ['name', 'url']);
    }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Webhook</h1>
          <p className="text-sm text-slate-400">
            Update target endpoint configuration
          </p>
        </div>
        <button
          type="button"
          onClick={() => void navigate(backUrl)}
          className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
        >
          Back to List
        </button>
      </div>

      <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 shadow-xl">
        {errors.root?.message && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
          >
            {errors.root.message}
          </div>
        )}

        <form
          onSubmit={(e) => void onSubmit(e)}
          noValidate
          className="space-y-4"
        >
          <div>
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              type="text"
              className={inputClass}
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p
                id="name-error"
                role="alert"
                className="mt-1 text-xs text-red-400"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="url" className={labelClass}>
              Target URL
            </label>
            <input
              id="url"
              type="url"
              className={inputClass}
              aria-invalid={errors.url ? 'true' : 'false'}
              aria-describedby={errors.url ? 'url-error' : undefined}
              {...register('url')}
            />
            {errors.url && (
              <p
                id="url-error"
                role="alert"
                className="mt-1 text-xs text-red-400"
              >
                {errors.url.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-700/60">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg shadow transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => void navigate(backUrl)}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
