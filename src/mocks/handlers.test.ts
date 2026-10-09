import { describe, expect, it } from 'vitest';
import { db } from './db';
import { CSRF_TOKEN } from './constants';
import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';

const BASE_URL = 'http://localhost';

function headers(csrf = false): HeadersInit {
  return {
    'X-Requested-With': 'XMLHttpRequest',
    ...(csrf ? { 'X-CSRF-TOKEN': CSRF_TOKEN } : {}),
  };
}

async function readError(response: Response) {
  return response.json() as Promise<{
    error: {
      type: string;
      message: string;
      payload?: Record<string, string[]>;
    };
  }>;
}

describe('MSW API contract', () => {
  it('rejects GET /csrf without X-Requested-With', async () => {
    const response = await fetch(`${BASE_URL}/csrf`);

    expect(response.status).toBe(400);
  });

  it('returns 419 before checking the session when CSRF is invalid', async () => {
    const response = await fetch(`${BASE_URL}/v1/webhooks/999`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ name: '', url: '' }),
    });

    expect(response.status).toBe(419);
  });

  it('returns 401 after valid CSRF when the session is missing', async () => {
    const response = await fetch(`${BASE_URL}/v1/webhooks/999`, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify({ name: '', url: '' }),
    });

    expect(response.status).toBe(401);
  });

  it('returns 404 before validating fields when the webhook does not exist', async () => {
    db.issueSession(getOrCreateFingerprint());

    const response = await fetch(`${BASE_URL}/v1/webhooks/999`, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify({ name: '', url: '' }),
    });

    expect(response.status).toBe(404);
  });

  it('returns multiple field errors for an invalid webhook update', async () => {
    db.issueSession(getOrCreateFingerprint());

    const response = await fetch(`${BASE_URL}/v1/webhooks/1`, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify({ name: '', url: 'not-a-url' }),
    });

    expect(response.status).toBe(422);

    const body = await readError(response);

    expect(body.error.type).toBe('ValidationException');
    expect(body.error.payload).toHaveProperty('name');
    expect(body.error.payload).toHaveProperty('url');
  });

  it('allows rotating an expired but not revoked session', async () => {
    const fingerprint = getOrCreateFingerprint();
    db.issueSession(fingerprint);
    db.expireSession();

    const response = await fetch(`${BASE_URL}/auth/token/rotate`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ fingerprint }),
    });

    expect(response.status).toBe(200);
    expect(db.isSessionValid()).toBe(true);
  });

  it('rejects rotating a revoked session with 400', async () => {
    const fingerprint = getOrCreateFingerprint();
    db.issueSession(fingerprint);
    db.session = null;

    const response = await fetch(`${BASE_URL}/auth/token/rotate`, {
      method: 'POST',
      headers: headers(true),
      body: JSON.stringify({ fingerprint }),
    });

    expect(response.status).toBe(400);
  });
});
