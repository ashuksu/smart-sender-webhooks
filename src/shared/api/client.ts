import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';
import { getCsrfToken, setCsrfToken, clearSessionData } from './session';

type OnUnauthorizedCallback = () => void;
let onUnauthorizedCallback: OnUnauthorizedCallback | null = null;

export function setOnUnauthorized(cb: OnUnauthorizedCallback) {
  onUnauthorizedCallback = cb;
}

export async function fetchCsrfToken(): Promise<string | null> {
  const res = await fetch('/api/csrf', {
    method: 'GET',
    headers: {
      'x-fingerprint': getOrCreateFingerprint(),
    },
  });
  const token = res.headers.get('X-CSRF-TOKEN');
  if (token) {
    setCsrfToken(token);
  }
  return token;
}

let isRotating = false;
let rotateSubscribers: Array<(success: boolean) => void> = [];

function subscribeTokenRotate(cb: (success: boolean) => void) {
  rotateSubscribers.push(cb);
}

function onRotateComplete(success: boolean) {
  rotateSubscribers.forEach((cb) => cb(success));
  rotateSubscribers = [];
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  const fingerprint = getOrCreateFingerprint();
  headers.set('x-fingerprint', fingerprint);

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    let csrf = getCsrfToken();
    if (!csrf) {
      csrf = await fetchCsrfToken();
    }
    if (csrf) {
      headers.set('X-CSRF-TOKEN', csrf);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 1. Handling CSRF Mismatch (419)
  if (response.status === 419 && !isRetry) {
    await fetchCsrfToken();
    return apiFetch<T>(url, options, true);
  }

  // 2. Handling 401 & Single-Flight Session Rotation
  if (response.status === 401) {
    if (
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/token/rotate')
    ) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || 'Unauthorized');
    }

    if (!isRotating) {
      isRotating = true;

      try {
        let csrf = getCsrfToken();
        if (!csrf) {
          csrf = await fetchCsrfToken();
        }

        const rotateRes = await fetch('/api/auth/token/rotate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-fingerprint': fingerprint,
            ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
          },
        });

        if (rotateRes.ok) {
          isRotating = false;
          onRotateComplete(true);
          return apiFetch<T>(url, options, true);
        } else {
          isRotating = false;
          onRotateComplete(false);
          clearSessionData();
          if (onUnauthorizedCallback) onUnauthorizedCallback();
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson?.error?.message || 'Session expired');
        }
      } catch (err) {
        isRotating = false;
        onRotateComplete(false);
        clearSessionData();
        if (onUnauthorizedCallback) onUnauthorizedCallback();
        throw err;
      }
    } else {
      const rotateSuccess = await new Promise<boolean>((resolve) => {
        subscribeTokenRotate(resolve);
      });

      if (rotateSuccess) {
        return apiFetch<T>(url, options, true);
      } else {
        throw new Error('Session expired');
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status}`;
    const error = new Error(message) as Error & {
      status: number;
      payload?: unknown;
    };
    error.status = response.status;
    error.payload = errorData?.error?.payload;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
