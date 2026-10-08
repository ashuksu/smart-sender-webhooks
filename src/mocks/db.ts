import type { Webhook, Me } from '@/shared/api/contract';
import { TEST_EMAIL, SESSION_TTL_MS } from './constants';

export interface SessionState {
  fingerprint: string;
  expiresAt: number;
  revoked: boolean;
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
    first_name: 'Denys',
    last_name: 'Developer',
    name: 'Denys Developer',
  };

  public webhooks: Webhook[] = [...initialWebhooks];

  // device_session_token -> fingerprint
  public pendingDeviceTokens = new Map<string, string>();

  // Active session
  public session: SessionState | null = null;

  // Statistics for automated testing
  public stats = {
    rotateCalls: 0,
    csrfCalls: 0,
  };

  // Delay config
  public config = {
    rotateDelayMs: 0,
  };

  private mockTime: number | null = null;

  public now(): number {
    return this.mockTime ?? Date.now();
  }

  public setMockTime(time: number | null) {
    this.mockTime = time;
  }

  public resetDb() {
    this.webhooks = [...initialWebhooks];
    this.pendingDeviceTokens.clear();
    this.session = null;
    this.stats = { rotateCalls: 0, csrfCalls: 0 };
    this.config = { rotateDelayMs: 0 };
    this.mockTime = null;
  }

  public expireSession() {
    if (this.session) {
      this.session.expiresAt = this.now() - 1;
    }
  }

  public issueSession(fingerprint: string) {
    this.session = {
      fingerprint,
      expiresAt: this.now() + SESSION_TTL_MS,
      revoked: false,
    };
  }

  public rotateSession() {
    if (!this.session || this.session.revoked) {
      return false;
    }
    this.session.expiresAt = this.now() + SESSION_TTL_MS;
    return true;
  }

  public isSessionValid(fingerprint?: string): boolean {
    if (!this.session || this.session.revoked) return false;
    if (fingerprint && this.session.fingerprint !== fingerprint) return false;
    return this.session.expiresAt > this.now();
  }
}

export const db = new MockDb();
