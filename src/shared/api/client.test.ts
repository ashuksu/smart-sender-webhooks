import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/mocks/db';
import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';
import { fetchCsrfToken, apiFetch } from './client';

describe('apiFetch & Single-Flight Token Rotation', () => {
  beforeEach(async () => {
    db.resetDb();
    db.issueSession(getOrCreateFingerprint());
    await fetchCsrfToken();
  });

  it('handles parallel 401 responses with a SINGLE /auth/token/rotate call', async () => {
    // Simulate an expired session
    db.expireSession();

    // Set artificial delay for session rotation (50ms)
    db.config.rotateDelayMs = 50;

    expect(db.stats.rotateCalls).toBe(0);

    // Launch 5 parallel requests
    const requests = [
      apiFetch('/api/v1/me'),
      apiFetch('/api/v1/webhooks?page=1'),
      apiFetch('/api/v1/webhooks/1'),
      apiFetch('/api/v1/webhooks?page=2'),
      apiFetch('/api/v1/me'),
    ];

    const results = await Promise.all(requests);

    // All 5 requests should complete successfully after one rotation
    expect(results).toHaveLength(5);
    expect(results[0]).toHaveProperty('email');

    // KEY CHECK: rotation is called exactly once
    expect(db.stats.rotateCalls).toBe(1);
  });
});
