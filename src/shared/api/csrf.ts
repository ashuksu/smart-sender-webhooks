import { toApiError } from './errors';
import { resolveApiUrl } from './url';

const CSRF_HEADER = 'X-CSRF-TOKEN';

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

async function requestToken(): Promise<string> {
  const response = await fetch(resolveApiUrl('/csrf'), {
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!response.ok) throw await toApiError(response);

  const token = response.headers.get(CSRF_HEADER);
  if (!token)
    throw new Error('GET /csrf did not return the X-CSRF-TOKEN header');

  cachedToken = token;
  return token;
}

/** Single-flight: parallel callers share one GET /csrf. */
export function getCsrfToken(): Promise<string> {
  if (cachedToken) return Promise.resolve(cachedToken);
  inflight ??= requestToken().finally(() => {
    inflight = null; // reset also on failure, otherwise the next attempt would await a stale promise
  });
  return inflight;
}

export function invalidateCsrfToken(): void {
  cachedToken = null;
}

export function resetCsrfToken(): void {
  cachedToken = null;
  inflight = null;
}
