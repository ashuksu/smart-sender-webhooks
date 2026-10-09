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
      apiFetch('/v1/me'),
      apiFetch('/v1/webhooks?page=1'),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('email');
    expect(results[1]).toHaveProperty('data');
    expect(db.stats.rotateCalls).toBe(1);
    expect(db.stats.csrfCalls).toBe(1);
    expect(isSessionActive()).toBe(true);
  });

  it('ends the session after a repeated 401 instead of looping', async () => {
    server.use(http.get('*/v1/me', () => unauthorized()));

    const error = await apiFetch('/v1/me').catch((e: unknown) => e);

    expect(isApiError(error) && error.status).toBe(401);
    expect(db.stats.rotateCalls).toBe(1);
    expect(isSessionActive()).toBe(false);
  });

  it('ends the session when rotate fails and does not retry rotate itself', async () => {
    let rotateAttempts = 0;

    server.use(
      http.post('*/auth/token/rotate', () => {
        rotateAttempts += 1;
        return unauthorized();
      })
    );

    db.expireSession();

    const error = await apiFetch('/v1/me').catch((e: unknown) => e);

    expect(isApiError(error) && error.status).toBe(401);
    expect(rotateAttempts).toBe(1);
    expect(isSessionActive()).toBe(false);
  });
});
