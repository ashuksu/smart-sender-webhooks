import { http, HttpResponse, delay } from 'msw';
import { db } from './db';
import { requireCsrf, requireSession } from './guards';
import { badRequest, validationFailed, notFound } from './errors';
import {
  TEST_EMAIL,
  TEST_PASSWORD,
  CSRF_TOKEN,
  CAPTCHA_HEADER,
} from './constants';

export const handlers = [
  // 1. GET /csrf
  http.get('*/api/csrf', () => {
    db.stats.csrfCalls++;
    return new HttpResponse(null, {
      status: 204,
      headers: {
        'X-CSRF-TOKEN': CSRF_TOKEN,
      },
    });
  }),

  // 2. POST /auth/login
  http.post('*/api/auth/login', async ({ request }) => {
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
      return validationFailed({
        password: ['Invalid email or password.'],
      });
    }

    const deviceToken = `dt_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    db.pendingDeviceTokens.set(deviceToken, body.fingerprint);

    return HttpResponse.json({ device_session_token: deviceToken });
  }),

  // 3. POST /auth/token/issue
  http.post('*/api/auth/token/issue', async ({ request }) => {
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

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // 4. POST /auth/token/rotate
  http.post('*/api/auth/token/rotate', async ({ request }) => {
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
    if (!db.rotateSession()) {
      return badRequest('No active session to rotate.');
    }

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // 5. POST /auth/token/revoke
  http.post('*/api/auth/token/revoke', async ({ request }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    if (db.session) {
      db.session.revoked = true;
      db.session = null;
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // 6. GET /v1/me
  http.get('*/api/v1/me', ({ request }) => {
    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    return HttpResponse.json(db.currentUser);
  }),

  // 7. GET /v1/webhooks
  http.get('*/api/v1/webhooks', ({ request }) => {
    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    const url = new URL(request.url);
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const limitParam = parseInt(url.searchParams.get('limit') || '10', 10);
    const searchParam = (url.searchParams.get('search') || '')
      .trim()
      .toLowerCase();
    const statusParam = url.searchParams.get('status');
    const activeParam = url.searchParams.get('active');

    const limit = isNaN(limitParam) || limitParam <= 0 ? 10 : limitParam;
    let filtered = db.webhooks;

    if (searchParam) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchParam)
      );
    }

    if (statusParam && statusParam !== 'all') {
      filtered = filtered.filter((item) =>
        statusParam === 'active' ? item.active : !item.active
      );
    } else if (activeParam !== null) {
      filtered = filtered.filter((item) =>
        activeParam === 'true' ? item.active : !item.active
      );
    }

    const total = filtered.length;
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

    const start = (currentPage - 1) * limit;
    const paginatedData =
      currentPage > lastPage ? [] : filtered.slice(start, start + limit);

    return HttpResponse.json({
      data: paginatedData,
      paging: {
        pages: {
          current: currentPage,
          last: lastPage,
        },
        results: {
          total,
          limitation: limit,
        },
      },
    });
  }),

  // 8. GET /v1/webhooks/:id
  http.get('*/api/v1/webhooks/:id', ({ request, params }) => {
    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    const id = Number(params.id);
    const item = db.webhooks.find((w) => w.id === id);

    if (!item) {
      return notFound(`Webhook with ID ${id} not found.`);
    }

    return HttpResponse.json(item);
  }),

  // 9. PUT /v1/webhooks/:id
  http.put('*/api/v1/webhooks/:id', async ({ request, params }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    const id = Number(params.id);
    const itemIndex = db.webhooks.findIndex((w) => w.id === id);

    if (itemIndex === -1) {
      return notFound(`Webhook with ID ${id} not found.`);
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      url?: string;
      active?: boolean;
    };

    const errors: Record<string, string[]> = {};

    if (!body.name || body.name.trim() === '') {
      errors.name = ['The name field is required.'];
    }

    if (!body.url || body.url.trim() === '') {
      errors.url = ['The url field is required.'];
    } else {
      try {
        const parsedUrl = new URL(body.url);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          errors.url = ['The url must be a valid HTTP/HTTPS URL.'];
        }
      } catch {
        errors.url = ['The url must be a valid URL.'];
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationFailed(errors);
    }

    const updated = {
      ...db.webhooks[itemIndex]!,
      name: body.name!.trim(),
      url: body.url!.trim(),
      active: body.active ?? db.webhooks[itemIndex]!.active,
    };

    db.webhooks[itemIndex] = updated;

    return HttpResponse.json(updated);
  }),

  // 10. DELETE /v1/webhooks/:id
  http.delete('*/api/v1/webhooks/:id', async ({ request, params }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    const id = Number(params.id);
    const itemIndex = db.webhooks.findIndex((w) => w.id === id);

    if (itemIndex === -1) {
      return notFound(`Webhook with ID ${id} not found.`);
    }

    db.webhooks.splice(itemIndex, 1);

    return new HttpResponse(null, { status: 204 });
  }),

  // 11. POST /v1/webhooks/:id/ping
  http.post('*/api/v1/webhooks/:id/ping', async ({ request, params }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    const id = Number(params.id);
    const item = db.webhooks.find((w) => w.id === id);

    if (!item) {
      return notFound(`Webhook with ID ${id} not found.`);
    }

    return HttpResponse.json({
      success: true,
      latency_ms: Math.floor(Math.random() * 120) + 25,
    });
  }),

  // 12. PATCH /v1/webhooks/:id/toggle
  http.patch('*/api/v1/webhooks/:id/toggle', async ({ request, params }) => {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const sessionError = requireSession(request);
    if (sessionError) return sessionError;

    const id = Number(params.id);
    const itemIndex = db.webhooks.findIndex((w) => w.id === id);

    if (itemIndex === -1) {
      return notFound(`Webhook with ID ${id} not found.`);
    }

    const body = (await request.json().catch(() => ({}))) as {
      active?: boolean;
    };

    const updated = {
      ...db.webhooks[itemIndex]!,
      active: body.active ?? !db.webhooks[itemIndex]!.active,
    };

    db.webhooks[itemIndex] = updated;

    return HttpResponse.json(updated);
  }),
];
