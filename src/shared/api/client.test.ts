import { describe, it, expect, beforeEach } from 'vitest';
import { http } from 'msw';
import { db } from '@/mocks/db';
import { server } from '@/mocks/node';
import { unauthorized } from '@/mocks/errors';
import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';
import { apiFetch } from './client';
import { isApiError } from './errors';
import { isSessionActive, startSession } from './session';

describe('apiFetch session handling', () => {
  beforeEach(() => {
    db.issueSession(getOrCreateFingerprint());
    startSession();
  });

  it('shares ONE rotate between parallel 401 responses and replays every request', async () => {
    db.expireSession();
    db.config.rotateDelayMs = 50;

    const results = await Promise.all([
      apiFetch('/api/v1/me'),
      apiFetch('/api/v1/webhooks?page=1'),
      apiFetch('/api/v1/webhooks/1'),
      apiFetch('/api/v1/webhooks?page=2'),
      apiFetch('/api/v1/me'),
    ]);

    expect(results).toHaveLength(5);
    expect(results[0]).toHaveProperty('email');
    expect(db.stats.rotateCalls).toBe(1);
    expect(db.stats.csrfCalls).toBe(1); // CSRF is single-flight too
  });

  it('ends the session after a repeated 401 instead of looping', async () => {
    server.use(http.get('*/api/v1/me', () => unauthorized()));

    const error = await apiFetch('/api/v1/me').catch((e: unknown) => e);

    expect(isApiError(error) && error.status).toBe(401);
    expect(db.stats.rotateCalls).toBe(1);
    expect(isSessionActive()).toBe(false);
  });
});
