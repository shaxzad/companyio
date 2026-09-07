# CompanyIO API

Fastify API providing PostgreSQL-backed authentication and organization endpoints through Prisma.

## Run

```bash
pnpm --filter @companyio/api dev
```

Configure `DATABASE_URL`, `API_HOST`, and `API_PORT` in the root `.env` file. Apply database migrations with `pnpm --filter @companyio/api exec prisma migrate dev`. The API exposes password signup/sign-in, session restoration, logout, current-user, and organization endpoints under `/api/v1`.
