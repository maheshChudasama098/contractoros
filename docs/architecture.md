# ContractorOS Architecture

Modular monolith on Next.js (spec §4). One deployable app + one worker process.

## Top-level layout

```
src/
  app/        Next.js routing ONLY (pages, layouts, route handlers). Thin adapters.
  web/        Frontend (browser/UI): components, feature UIs, API client.
  server/     Backend: domain modules, DB, auth, RBAC, audit, jobs, integrations.
  shared/     Code used by both sides: Zod contracts, DTO types, money/date helpers.
prisma/       schema.prisma, migrations, seed
workers/      BullMQ worker process (email, PDF, QuickBooks sync, webhooks)
tests/        unit / integration / e2e / security
docs/         architecture, ADRs, runbooks, openapi.yaml
```

## Request flow

```
Browser ──> src/app/api/v1/**/route.ts      (parse + validate with @shared contract)
              └─> src/server/modules/<m>/   service: authorize -> business rules -> transaction
                    └─> <m>.repository.ts   Prisma, ALWAYS scoped by organizationId
                    └─> core/audit          append-only audit event in same transaction
```

## Import rules (enforced by ESLint)

| From \ To | web | server | shared |
|-----------|-----|--------|--------|
| app       | yes | yes    | yes    |
| web       | yes | **no** | yes    |
| server    | **no** | yes | yes    |
| shared    | no  | no     | yes (no React/Next/Prisma) |

- Outside a module, import only from `@server/modules/<m>` (its `index.ts`).
- Every server file starts with `import "server-only"` so it can never land in a client bundle.

## Server module anatomy

```
src/server/modules/leads/
  index.ts            public API of the module
  lead.service.ts     use-cases + business rules + authorization
  lead.repository.ts  data access (tenant-scoped)
  lead.mapper.ts      DB row -> DTO (strip internal fields here)
```

Add `<m>.policy.ts` for record-level rules and `<m>.state.ts` for state machines (spec §11).

## Non-negotiables (spec §26)

- Organization comes from `requireTenantContext()` — never from request body/query.
- Money: `NUMERIC(12,2)` in DB, decimal strings in API, `bigint` cents in math. No floats.
- Lifecycle changes go through commands (`issue`, `approve`, `void`), not generic PATCH.
- Long-running/external work goes to a queue (`server/core/jobs`) and runs in `workers/`.
- Any deviation → write an ADR in `docs/adr/`.
