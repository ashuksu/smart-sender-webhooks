import { apiFetch } from './client';
import type {
  Webhook,
  WebhookListParams,
  WebhookListResponse,
  WebhookUpdateInput,
} from './contract';

export function getWebhooks(
  params: WebhookListParams = {},
  signal?: AbortSignal
): Promise<WebhookListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') {
    query.set('status', params.status);
    query.set('active', params.status === 'active' ? 'true' : 'false');
  }

  const queryString = query.toString();
  const path = `/api/v1/webhooks${queryString ? `?${queryString}` : ''}`;

  return apiFetch<WebhookListResponse>(path, { signal });
}

export function getWebhook(id: number, signal?: AbortSignal): Promise<Webhook> {
  return apiFetch<Webhook>(`/api/v1/webhooks/${id}`, { signal });
}

export function updateWebhook(
  id: number,
  data: WebhookUpdateInput
): Promise<Webhook> {
  return apiFetch<Webhook>(`/api/v1/webhooks/${id}`, {
    method: 'PUT',
    json: data,
  });
}

export function toggleWebhookStatus(
  id: number,
  active: boolean
): Promise<Webhook> {
  return apiFetch<Webhook>(`/api/v1/webhooks/${id}/toggle`, {
    method: 'PATCH',
    json: { active },
  });
}

export function deleteWebhook(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/webhooks/${id}`, {
    method: 'DELETE',
  });
}

export function pingWebhook(
  id: number
): Promise<{ success: boolean; latency_ms: number }> {
  return apiFetch<{ success: boolean; latency_ms: number }>(
    `/api/v1/webhooks/${id}/ping`,
    {
      method: 'POST',
    }
  );
}
