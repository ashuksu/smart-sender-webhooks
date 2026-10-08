import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { getFieldErrors, isApiError } from '@/shared/api/errors';

/**
 * Maps a 422 payload onto form fields; anything unmatched goes to `root`.
 * Reused by the login and webhook edit forms.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[]
): void {
  if (!isApiError(error)) {
    setError('root', {
      type: 'network',
      message: 'Network error. Please try again.',
    });
    return;
  }

  const fieldErrors = getFieldErrors(error);
  let matched = false;
  for (const field of fields) {
    const message = fieldErrors[field];
    if (message) {
      setError(field, { type: 'server', message });
      matched = true;
    }
  }
  if (!matched) setError('root', { type: 'server', message: error.message });
}
