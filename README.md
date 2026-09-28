# TraceBack

TraceBack is a privacy-first lost-and-found workspace for reporting items, reviewing potential matches, and coordinating verified returns.

## What is included

- Independent account registration, login, logout, password reset, and email-verification endpoints
- User-owned reports with server-enforced ownership checks
- Automatic lost/found matching with shared-attribute explanations
- Private conversations, notifications, recovery cases, and activity history
- Responsive landing page and authenticated workspace
- Empty, loading, error, and mobile navigation states
- Light/dark theme support

## Project structure

- `artifacts/traceback` — Vite + React web client, written in JavaScript/JSX
- `artifacts/api-server` — Express API server, written in JavaScript
- `lib/api-spec` — OpenAPI contract used by the generated client
- `lib/api-client-react` — generated React Query client
- `lib/api-zod` — generated request/response schemas

The app uses PostgreSQL for durable storage in this workspace. The API creates its `tb_*` tables on startup and scopes report, match, message, notification, and recovery queries to the authenticated account.

## Local development

Install dependencies from the workspace root:

```bash
pnpm install
```

Start the API and web workflows:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/traceback run dev
```

The API reads `DATABASE_URL` and uses `SESSION_SECRET` (or `JWT_SECRET`) to sign the HTTP-only session cookie. The frontend talks to the API through `/api`.

## Verification

```bash
pnpm run typecheck
pnpm --dir artifacts/traceback run build
```

