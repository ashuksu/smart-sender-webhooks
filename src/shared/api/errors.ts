import type { ApiErrorBody } from './contract';

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly payload: Record<string, string[]> | undefined;

  constructor(
    status: number,
    type: string,
    message: string,
    payload?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Builds an ApiError from a non-2xx response; tolerates non-JSON bodies. */
export async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response
    .json()
    .catch(() => null)) as Partial<ApiErrorBody> | null;
  const error = body?.error;
  return new ApiError(
    response.status,
    error?.type ?? 'HttpError',
    error?.message ?? `HTTP ${response.status}`,
    error?.payload
  );
}

/** First server message per field: { url: ['...'] } -> { url: '...' } */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isApiError(error) || !error.payload) return result;
  for (const [field, messages] of Object.entries(error.payload)) {
    const first = messages[0];
    if (first) result[field] = first;
  }
  return result;
}
