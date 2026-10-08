import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/shared/api/errors';
import { onSessionEnded } from '@/shared/api/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

onSessionEnded(() => {
  queryClient.clear();
});
