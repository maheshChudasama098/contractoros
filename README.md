# ContractorOS

Multi-tenant SaaS for US residential remodeling contractors. Spec: `docs/ContractorOS_Development_Specification.docx`.
Architecture: [docs/architecture.md](docs/architecture.md).

## Folder guide

| Folder | What goes here |
|--------|----------------|
| `src/app/` | Routes only: `(auth)`, `(dashboard)`, `(customer-portal)`, `api/v1`. Keep thin. |
| `src/web/` | **Frontend** — UI components, feature screens, API client. |
| `src/server/` | **Backend** — `core/` (db, auth, tenancy, RBAC, audit, http, jobs), `modules/` (domain), `integrations/`. |
| `src/shared/` | Zod contracts + types + helpers used by both web and server. |
| `prisma/` | Database schema, migrations, seed. |
| `workers/` | Background job process (BullMQ). |
| `tests/` | `unit`, `integration`, `e2e`, `security`. |

`leads` is a complete example slice: `shared/contracts/leads.ts` → `app/api/v1/leads/route.ts` → `server/modules/leads/` → `web/features/leads/`. Copy that pattern for new modules.

## Getting started

```bash
cp .env.example .env
docker compose up -d          # Postgres + Redis
npm install
npm run db:migrate            # create tables
npm run db:seed               # permissions + system roles
npm run dev                   # web + API on http://localhost:3000
npm run worker                # background jobs (separate terminal)
```

## Scripts

`lint`, `typecheck`, `test`, `build`, `worker`, `db:migrate`, `db:seed`, `db:studio`.
