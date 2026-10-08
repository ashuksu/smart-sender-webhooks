import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/app/providers/queryClient';
import {
  deleteWebhook,
  getWebhook,
  getWebhooks,
  pingWebhook,
  toggleWebhookStatus,
  updateWebhook,
} from '@/shared/api/webhooks';
import type { WebhookFilterState } from './useWebhookFilters';
import type { WebhookUpdateInput } from '@/shared/api/contract';

export function useWebhooksQuery(filters: WebhookFilterState) {
  return useQuery({
    queryKey: ['webhooks', filters],
    queryFn: ({ signal }) => getWebhooks(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useWebhookDetailQuery(id: number) {
  return useQuery({
    queryKey: ['webhooks', 'detail', id],
    queryFn: ({ signal }) => getWebhook(id, signal),
    enabled: Boolean(id),
  });
}

export function useWebhookMutations() {
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      toggleWebhookStatus(id, active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWebhook(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WebhookUpdateInput }) =>
      updateWebhook(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queryClient.invalidateQueries({
        queryKey: ['webhooks', 'detail', variables.id],
      });
    },
  });

  const pingMutation = useMutation({
    mutationFn: (id: number) => pingWebhook(id),
  });

  return {
    toggleWebhook: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    deleteWebhook: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    updateWebhook: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    pingWebhook: pingMutation.mutateAsync,
    isPinging: pingMutation.isPending,
  };
}
