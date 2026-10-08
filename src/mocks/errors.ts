import { HttpResponse } from 'msw';
import type { ApiErrorBody } from '@/shared/api/contract';

export function errorResponse(
  status: number,
  type: string,
  message: string,
  payload?: Record<string, string[]>
) {
  const body: ApiErrorBody = {
    error: {
      type,
      message,
      ...(payload ? { payload } : {}),
    },
  };
  return HttpResponse.json(body, { status });
}

export function badRequest(message = 'Bad Request') {
  return errorResponse(400, 'BadRequestException', message);
}

export function unauthorized(message = 'Unauthenticated.') {
  return errorResponse(401, 'AuthenticationException', message);
}

export function notFound(message = 'Resource not found.') {
  return errorResponse(404, 'NotFoundException', message);
}

export function tokenMismatch(message = 'CSRF token mismatch.') {
  return errorResponse(419, 'TokenMismatchException', message);
}

export function validationFailed(payload: Record<string, string[]>) {
  return errorResponse(
    422,
    'ValidationException',
    'The given data was invalid.',
    payload
  );
}
