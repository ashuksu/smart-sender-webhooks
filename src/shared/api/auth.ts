import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';
import { apiFetch } from './client';
import { CAPTCHA_HEADER, CAPTCHA_TOKEN } from './constants';
import type { Me } from './contract';

/** Returns device_session_token; the caller must keep it in memory only. */
export async function login(email: string, password: string): Promise<string> {
  const response = await apiFetch<{ device_session_token: string }>(
    '/api/auth/login',
    {
      method: 'POST',
      auth: false,
      headers: { [CAPTCHA_HEADER]: CAPTCHA_TOKEN },
      json: { email, password, fingerprint: getOrCreateFingerprint() },
    }
  );
  return response.device_session_token;
}

export function issueSession(deviceSessionToken: string): Promise<unknown> {
  return apiFetch('/api/auth/token/issue', {
    method: 'POST',
    auth: false,
    json: {
      device_session_token: deviceSessionToken,
      fingerprint: getOrCreateFingerprint(),
    },
  });
}

export function revokeSession(): Promise<void> {
  return apiFetch<void>('/api/auth/token/revoke', {
    method: 'POST',
    auth: false,
    json: { fingerprint: getOrCreateFingerprint() },
  });
}

export function getMe(signal?: AbortSignal): Promise<Me> {
  return apiFetch<Me>('/api/v1/me', { signal });
}
