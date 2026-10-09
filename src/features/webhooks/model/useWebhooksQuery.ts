import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getWebhook, getWebhooks, updateWebhook } from '@/shared/api/webhooks';
import type { WebhookFilterState } from './useWebhookFilters';
import type { WebhookUpdateInput } from '@/shared/api/contract';

export function useWebhooksQuery(filters: WebhookFilterState) {
  return useQuery({
    queryKey: ['webhooks', 'list', filters],
    queryFn: ({ signal }) => getWebhooks(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useWebhookDetailQuery(id: number) {
  return useQuery({
    queryKey: ['webhooks', 'detail', id],
    queryFn: ({ signal }) => getWebhook(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WebhookUpdateInput) => updateWebhook(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });
}
