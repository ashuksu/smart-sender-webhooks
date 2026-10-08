import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { applyServerErrors } from '@/shared/lib/applyServerErrors';
import {
  useWebhookDetailQuery,
  useWebhookMutations,
} from '../model/useWebhooksQuery';

const webhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Enter a valid URL'),
  active: z.boolean(),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

const inputClass =
  'w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 aria-[invalid=true]:border-red-500 text-sm';
const labelClass =
  'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1';

export function WebhookEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const numericId = id ? Number(id) : 0;
  const {
    data: webhook,
    isLoading,
    isError,
    error,
  } = useWebhookDetailQuery(numericId);
  const { updateWebhook, isUpdating } = useWebhookMutations();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: '',
      url: '',
      active: true,
    },
  });

  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name,
        url: webhook.url,
        active: webhook.active,
      });
    }
  }, [webhook, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!numericId) return;
    try {
      await updateWebhook({
        id: numericId,
        data: {
          name: values.name,
          url: values.url,
          active: values.active,
        },
      });

      void navigate('/webhooks');
    } catch (err) {
      applyServerErrors(err, setError, ['name', 'url']);
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading webhook details...
      </div>
    );
  }

  if (isError || !webhook) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
        Error loading webhook:{' '}
        {error instanceof Error ? error.message : 'Not found'}
      </div>
    );
  }

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
          onClick={() => void navigate('/webhooks')}
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
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
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
              {...register('url')}
            />
            {errors.url && (
              <p className="mt-1 text-xs text-red-400">{errors.url.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              id="active"
              type="checkbox"
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-sky-500"
              {...register('active')}
            />
            <label
              htmlFor="active"
              className="text-sm text-slate-300 font-medium"
            >
              Active endpoint
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-700/60">
            <button
              type="submit"
              disabled={isSubmitting || isUpdating}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold rounded-lg shadow transition disabled:opacity-50"
            >
              {isSubmitting || isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => void navigate('/webhooks')}
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
