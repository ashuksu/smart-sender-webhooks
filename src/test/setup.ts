import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '../mocks/node';
import { db } from '../mocks/db';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  db.resetDb();
});
afterAll(() => server.close());
