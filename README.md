# Smart Sender: Webhooks (test task)

Small React + TypeScript app: login, webhook list, webhook edit.
The backend is mocked with MSW, following the contract from the task.

## Run

Requirements: Node 22, pnpm.

    pnpm install
    pnpm dev          # http://localhost:5173
    pnpm test:run     # automated tests
    pnpm typecheck && pnpm lint && pnpm build

## Test credentials

- Email: `admin@smartsender.com`
- Password: `password123`

They are pre-filled on the login page.

## Stack

React 19, TypeScript (strict), Vite, MSW, TanStack Query, React Router,
React Hook Form + Zod, Zustand, Tailwind CSS, Vitest.

## Project structure (Feature-Sliced Design, lite)

    src/
      app/        providers, router
      pages/      webhooks list, webhook edit
      features/   auth (login, auth store), webhooks (filters, queries)
      shared/     api client, csrf, session, errors, helpers
      mocks/      MSW handlers and in-memory db (mock backend)

A monorepo was not needed for this size.

## Key decisions

- **One HTTP layer** (`shared/api/client.ts`). It adds
  `X-Requested-With`, the CSRF token, and handles 401 and 419.
  UI and state code never deal with tokens or retries.
- **Session.** `device_session_token` lives only in a local variable during
  login (never in storage, state or URL). `fingerprint` is 32 hex chars,
  created once and kept in `localStorage`. The session itself is held by the
  mock (like an HttpOnly cookie).
- **401 handling.** Parallel 401s share one `rotate` promise. Auth requests
  (`login`, `issue`, `rotate`, `revoke`) never start a rotate. Each request
  is retried once. A generation counter prevents a late 401 from starting a
  second rotate. If rotate fails or a retry gets 401, the session ends: query
  cache is cleared and the user goes to the login page.
- **CSRF.** `GET /csrf` runs once (shared promise) before the first API
  request. The token is sent on POST and PUT. On 419 the token is fetched
  again and the request is retried once.
- **URL as source of truth.** `page` and `search` live in the URL, so reload
  and back/forward work. A new search resets the page. Search input is
  debounced (300 ms).
- **Forms.** React Hook Form + Zod. Server 422 errors are shown next to the
  fields (`applyServerErrors`), for both login and edit.
- **Server state** is in TanStack Query (with `keepPreviousData` for
  pagination). Zustand holds only the auth state.

## Tests

`src/shared/api/client.test.ts`:

1. Parallel requests with 401 use one `rotate`, then all succeed.
2. A repeated 401 ends the session (no retry loop).

## Mock notes

- All state is in memory. After a page reload the mock is reset, so you need
  to log in again. The requested URL (page, search) is restored after login
  (`returnTo`, checked against open redirects).
- Session lives 30 seconds; `rotate` extends it by 30 seconds and also works
  for an expired (not revoked) session.
- The mock adds a small delay (250 ms) in dev so loading states are visible,
  and rejects requests without `X-Requested-With` to catch client mistakes.

## Troubleshooting

If the list suddenly shows `HTTP 404` after the tab was idle (or the laptop
slept), the browser stopped the MSW service worker. Reload the page and log in
again. This only affects the mocked dev environment.

## Not done

- Session sync between browser tabs.
- Proactive rotate by timer (we rotate on 401).
- Runtime validation of API responses.
- E2E tests (Playwright), i18n.
- Unsaved changes warning on the edit form.