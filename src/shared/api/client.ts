import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';
import { getCsrfToken, invalidateCsrfToken } from './csrf';
import { toApiError } from './errors';
import {
  bumpSessionGeneration,
  endSession,
  getSessionGeneration,
  isSessionActive,
} from './session';
import { resolveApiUrl } from './url';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  json?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Set to false for auth endpoints: a 401 there must never trigger a rotate. */
  auth?: boolean;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT']);

let rotatePromise: Promise<void> | null = null;

/** Single-flight rotate: every concurrent caller awaits the same promise. */
function rotateSession(): Promise<void> {
  rotatePromise ??= apiFetch<unknown>('/auth/token/rotate', {
    method: 'POST',
    json: { fingerprint: getOrCreateFingerprint() },
    auth: false,
  })
    .then(() => {
      bumpSessionGeneration();
    })
    .catch((error: unknown) => {
      endSession();
      throw error;
    })
    .finally(() => {
      rotatePromise = null;
    });
  return rotatePromise;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    json,
    headers: extraHeaders,
    signal,
    auth = true,
  } = options;
  let csrfRetried = false;
  let authRetried = false;

  for (;;) {
    const generation = getSessionGeneration();
    const csrfToken = await getCsrfToken();

    const headers = new Headers(extraHeaders);
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');
    if (json !== undefined) headers.set('Content-Type', 'application/json');
    if (UNSAFE_METHODS.has(method)) headers.set('X-CSRF-TOKEN', csrfToken);

    const response = await fetch(resolveApiUrl(path), {
      method,
      headers,
      signal,
      body: json === undefined ? undefined : JSON.stringify(json),
    });

    if (response.status === 419 && !csrfRetried) {
      csrfRetried = true;
      invalidateCsrfToken();
      continue;
    }

    if (response.status === 401 && auth && isSessionActive()) {
      if (authRetried) {
        // Repeated 401 after a successful rotate: the session is gone for good
        endSession();
        throw await toApiError(response);
      }
      authRetried = true;
      if (getSessionGeneration() === generation) {
        await rotateSession(); // throws (and ends the session) when rotate fails
      }
      continue;
    }

    if (!response.ok) throw await toApiError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
