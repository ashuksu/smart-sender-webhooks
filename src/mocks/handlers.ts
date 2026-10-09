import { http, HttpResponse, delay } from 'msw';
import type { Webhook } from '@/shared/api/contract';
import { db } from './db';
import { requireCsrf, requireSession } from './guards';
import { badRequest, validationFailed, notFound } from './errors';
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  CSRF_TOKEN,
  CAPTCHA_HEADER,
} from './constants';

async function simulateLatency() {
  if (db.config.latencyMs > 0) await delay(db.config.latencyMs);
}

function validateUrl(value: string): string | null {
  if (!value) return 'The url field is required.';
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:'
      ? null
      : 'The url must be a valid HTTP/HTTPS URL.';
  } catch {
    return 'The url must be a valid URL.';
  }
}

export const handlers = [
  // GET /csrf
  http.get('*/csrf', () => {
    db.stats.csrfCalls++;
    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
    });
  }),

  // POST /auth/login
  http.post('*/auth/login', async ({ request }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const captcha = request.headers.get(CAPTCHA_HEADER);
    if (!captcha || captcha.trim() === '') {
      return badRequest('X-Captcha-Token header is required.');
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      fingerprint?: string;
    };

    if (!body.email || !body.password || !body.fingerprint) {
      const payload: Record<string, string[]> = {};
      if (!body.email) payload.email = ['The email field is required.'];
      if (!body.password)
        payload.password = ['The password field is required.'];
      if (!body.fingerprint)
        payload.fingerprint = ['The fingerprint field is required.'];

      return validationFailed(payload);
    }

    if (body.email !== TEST_EMAIL || body.password !== TEST_PASSWORD) {
      return validationFailed({ password: ['Invalid email or password.'] });
    }

    const deviceToken = `dt_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    db.pendingDeviceTokens.set(deviceToken, body.fingerprint);

    return HttpResponse.json({ device_session_token: deviceToken });
  }),

  // POST /auth/token/issue
  http.post('*/auth/token/issue', async ({ request }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const body = (await request.json().catch(() => ({}))) as {
      device_session_token?: string;
      fingerprint?: string;
    };

    if (!body.device_session_token || !body.fingerprint) {
      return badRequest('Missing token or fingerprint.');
    }

    const expectedFingerprint = db.pendingDeviceTokens.get(
      body.device_session_token
    );
    if (!expectedFingerprint || expectedFingerprint !== body.fingerprint) {
      return validationFailed({
        device_session_token: ['Invalid or expired device session token.'],
      });
    }

    db.pendingDeviceTokens.delete(body.device_session_token);
    db.issueSession(body.fingerprint);

    return HttpResponse.json({ success: true });
  }),

  // POST /auth/token/rotate
  http.post('*/auth/token/rotate', async ({ request }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const body = (await request.json().catch(() => ({}))) as {
      fingerprint?: string;
    };

    if (db.config.rotateDelayMs > 0) {
      await delay(db.config.rotateDelayMs);
    }

    db.stats.rotateCalls++;

    if (!body.fingerprint || db.session?.fingerprint !== body.fingerprint) {
      return badRequest('No active session to rotate.');
    }
    db.rotateSession();

    return HttpResponse.json({ success: true });
  }),

  // POST /auth/token/revoke
  http.post('*/auth/token/revoke', async ({ request }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /v1/me
  http.get('*/v1/me', ({ request }) => {
    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    return HttpResponse.json(db.currentUser);
  }),

  // GET /v1/webhooks
  http.get('*/v1/webhooks', async ({ request }) => {
    const sessionError = requireSession(request);
    if (sessionError) return sessionError;
    await simulateLatency();

    const url = new URL(request.url);
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const limitParam = parseInt(url.searchParams.get('limit') || '10', 10);
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    const limit = isNaN(limitParam) || limitParam <= 0 ? 10 : limitParam;
    const filtered = search
      ? db.webhooks.filter((item) => item.name.toLowerCase().includes(search))
      : db.webhooks;

    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const start = (currentPage - 1) * limit;

    return HttpResponse.json({
      data: currentPage > lastPage ? [] : filtered.slice(start, start + limit),
      paging: {
        pages: { current: currentPage, last: lastPage },
        results: { total, limitation: limit },
      },
    });
  }),

  // GET /v1/webhooks/:id
  http.get('*/v1/webhooks/:id', async ({ request, params }) => {
    const sessionError = requireSession(request);
    if (sessionError) return sessionError;
    await simulateLatency();

    const id = Number(params.id);
    const item = db.webhooks.find((w) => w.id === id);
    if (!item) return notFound(`Webhook with ID ${id} not found.`);

    return HttpResponse.json(item);
  }),

  // PUT /v1/webhooks/:id
  http.put('*/v1/webhooks/:id', async ({ request, params }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const sessionError = requireSession(request);
    if (sessionError) return sessionError;
    await simulateLatency();

    const id = Number(params.id);
    const current = db.webhooks.find((w) => w.id === id);
    if (!current) return notFound(`Webhook with ID ${id} not found.`);

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      url?: string;
    };
    const name = body.name?.trim() ?? '';
    const url = body.url?.trim() ?? '';

    const errors: Record<string, string[]> = {};
    if (!name) errors.name = ['The name field is required.'];
    const urlError = validateUrl(url);
    if (urlError) errors.url = [urlError];
    if (Object.keys(errors).length > 0) return validationFailed(errors);

    const updated: Webhook = { ...current, name, url };
    db.webhooks = db.webhooks.map((w) => (w.id === id ? updated : w));

    return HttpResponse.json(updated);
  }),
];
