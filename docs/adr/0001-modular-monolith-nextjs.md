# ADR 0001: Modular monolith in a single Next.js app

Status: Accepted (2026-10-29)

## Context
Spec §1/§4 requires Next.js App Router for UI and Route Handlers for the API, with no microservices initially.

## Decision
One Next.js app. Inside `src/`, code is split into `web/` (frontend), `server/` (backend) and `shared/` (contracts).
`src/app/` holds routing only. Boundaries are enforced with ESLint `no-restricted-imports` and the `server-only` package.
Background work runs in a separate `workers/` process using BullMQ.

## Consequences
- Single deploy and single repo; simple for a 10–50 person product.
- `server/modules/*` can later be extracted into a service if scale or team ownership justifies it.
