# Smart Sender: Webhooks

Small React + TypeScript app: sign in, webhook list with pagination and search, webhook edit. The backend is mocked with MSW according to the test task contract.

## Run

Requirements: Node 22, pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm test:run       # automated tests
pnpm typecheck && pnpm lint && pnpm build
```

## Test credentials

- Email: `admin@smartsender.com`
- Password: `password123`

They are pre-filled on the login page.

## Key decisions

- **Tokens never reach JS storage.** `device_session_token` lives only in a local variable during login. The session is held by the mock, like an HttpOnly cookie. `fingerprint` (32 hex chars) is created once and stored in `localStorage`.
- **One HTTP layer** (`src/shared/api/client.ts`) adds `X-Requested-With` and the CSRF token, and handles 401 and 419 retries. UI code never deals with tokens.
- **Parallel 401s share one rotate.** A single-flight promise and a session generation counter prevent duplicate rotates. Auth endpoints never trigger rotate. A failed rotate or a repeated 401 ends the session.
- **URL is the source of truth** for `page` and `search`. Search is debounced (300 ms) and resets the page.
- **Forms:** React Hook Form + Zod on the client; server 422 errors are shown next to the fields.
- **State:** TanStack Query for server data, Zustand for auth only.
- **Structure:** Feature-Sliced Design (lite): `app`, `pages`, `features`, `shared`, `mocks`.

## Tests

`pnpm test:run` runs 31 tests:

- Parallel 401 responses share one rotate and both requests are replayed (`src/shared/api/client.test.ts`).
- Mock contract: headers, CSRF, session and validation order.
- URL filter parsing and safe `returnTo`.
- Edit form validation and server errors.

## Not done

- Session sync between browser tabs.
- Proactive rotate by timer (rotate happens on 401, as the task requires).
- Runtime validation of API responses (types are trusted, not parsed).
- E2E tests (Playwright) and i18n. The required automated test is `client.test.ts`.
- Unsaved-changes warning on the edit form.

## Production notes

- Demo credentials are pre-filled on the client; remove them in production.
- The captcha header is accepted by the mock without verification.
- Mock device tokens use `Math.random`; a real backend must issue them server-side.
- Server error messages are shown as-is in the list error state; a production build should show a generic message.

## Notes

- Mock state is in memory. Reloading the page resets it, so log in again. The list URL (page, search) is restored after login.
- MSW is on in development and off in production by default. Override with `VITE_ENABLE_MOCKS=true` or `false`.
