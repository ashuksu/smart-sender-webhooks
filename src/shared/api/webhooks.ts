import { apiFetch } from './client';
import type {
  Webhook,
  WebhookList,
  WebhookListParams,
  WebhookUpdateInput,
} from './contract';

export const WEBHOOKS_PAGE_SIZE = 10;

export function getWebhooks(
  params: WebhookListParams = {},
  signal?: AbortSignal
): Promise<WebhookList> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? WEBHOOKS_PAGE_SIZE),
  });
  const search = params.search?.trim();
  if (search) query.set('search', search);

  return apiFetch<WebhookList>(`/v1/webhooks?${query.toString()}`, {
    signal,
  });
}

export function getWebhook(id: number, signal?: AbortSignal): Promise<Webhook> {
  return apiFetch<Webhook>(`/v1/webhooks/${id}`, { signal });
}

export function updateWebhook(
  id: number,
  data: WebhookUpdateInput
): Promise<Webhook> {
  return apiFetch<Webhook>(`/v1/webhooks/${id}`, {
    method: 'PUT',
    json: data,
  });
}
