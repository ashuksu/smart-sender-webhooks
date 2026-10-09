import type { Webhook, Me } from '@/shared/api/contract';
import { TEST_EMAIL, SESSION_TTL_MS } from './constants';

export interface SessionState {
  fingerprint: string;
  expiresAt: number;
}

const initialWebhooks: Webhook[] = Array.from({ length: 28 }, (_, index) => {
  const id = index + 1;
  const categories = [
    'Orders',
    'Payments',
    'Users',
    'Leads',
    'System',
    'Analytics',
  ];
  const category = categories[index % categories.length];
  return {
    id,
    name: `${category} Webhook #${id}`,
    url: `https://api.example.com/hooks/${category?.toLowerCase()}-${id}`,
    active: index % 3 !== 0,
    created_at: new Date(Date.now() - (28 - id) * 86_400_000).toISOString(),
  };
});

class MockDb {
  public currentUser: Me = {
    id: 1,
    email: TEST_EMAIL,
    first_name: 'Admin',
    last_name: 'Developer',
    name: 'Admin Developer',
  };

  public webhooks: Webhook[] = [...initialWebhooks];

  // device_session_token -> fingerprint
  public pendingDeviceTokens = new Map<string, string>();

  // Issued session; null before issue and after revoke
  public session: SessionState | null = null;

  // Statistics for automated testing
  public stats = { rotateCalls: 0, csrfCalls: 0 };

  public config = {
    rotateDelayMs: 0,
    latencyMs: 0,
  };

  public resetDb() {
    this.webhooks = [...initialWebhooks];
    this.pendingDeviceTokens.clear();
    this.session = null;
    this.stats = { rotateCalls: 0, csrfCalls: 0 };
    this.config = { rotateDelayMs: 0, latencyMs: 0 };
  }

  public issueSession(fingerprint: string) {
    this.session = { fingerprint, expiresAt: Date.now() + SESSION_TTL_MS };
  }

  public expireSession() {
    if (this.session) this.session.expiresAt = Date.now() - 1;
  }

  /** Extends the session; works for an expired (but not revoked) session. */
  public rotateSession() {
    if (this.session) this.session.expiresAt = Date.now() + SESSION_TTL_MS;
  }

  public isSessionValid(): boolean {
    return this.session !== null && this.session.expiresAt > Date.now();
  }
}

export const db = new MockDb();
