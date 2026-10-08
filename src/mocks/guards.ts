import { db } from './db';
import { CSRF_TOKEN } from './constants';
import { badRequest, tokenMismatch, unauthorized } from './errors';

/** Self-check for client regressions: every API request must carry X-Requested-With. */
function requireAjaxHeader(request: Request) {
  if (request.headers.get('X-Requested-With') !== 'XMLHttpRequest') {
    return badRequest('The X-Requested-With header is required.');
  }
  return null;
}

export function requireCsrf(request: Request) {
  const ajaxError = requireAjaxHeader(request);
  if (ajaxError) return ajaxError;

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
  const ajaxError = requireAjaxHeader(request);
  if (ajaxError) return ajaxError;

  if (!db.isSessionValid()) {
    return unauthorized();
  }
  return null;
}
