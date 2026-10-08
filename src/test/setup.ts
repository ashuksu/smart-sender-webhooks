import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '../mocks/node';
import { db } from '../mocks/db';
import { endSession } from '@/shared/api/session';
import { resetCsrfToken } from '@/shared/api/csrf';

beforeAll(() => server.listen()); // server.listen({ onUnhandledRequest: 'error' })
afterEach(() => {
  server.resetHandlers();
  db.resetDb();
  endSession();
  resetCsrfToken();
});
afterAll(() => server.close());
