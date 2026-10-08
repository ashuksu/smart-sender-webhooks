import { db } from './db';
import { CSRF_TOKEN } from './constants';
import { tokenMismatch, unauthorized } from './errors';

export function requireCsrf(request: Request) {
  const method = request.method.toUpperCase();
  if (method === 'POST' || method === 'PUT') {
    const headerToken = request.headers.get('X-CSRF-TOKEN');
    if (!headerToken || headerToken !== CSRF_TOKEN) {
      return tokenMismatch();
    }
  }
  return null;
}

export function requireSession(request: Request) {
  const fingerprint = request.headers.get('x-fingerprint') ?? undefined;
  if (!db.isSessionValid(fingerprint)) {
    return unauthorized();
  }
  return null;
}
