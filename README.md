# Mentos / Nyumba PMS — Backend

NestJS + TypeORM + Postgres backend for the Nyumba property-management system.
The frontend contract lives in `../mentos-frontend/lib/{api,types}.ts`.

- **Plan:** [docs/BACKEND_PLAN.md](docs/BACKEND_PLAN.md)
- **Conventions:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Quick start

```bash
cp .env.example .env          # adjust if needed
docker compose up -d          # Postgres on :5432
npm install
npm run start:dev             # API on :4000, Swagger on :4000/docs
```

Health check: `GET http://localhost:4000/api/health`

## Browsing the database (Adminer)

```bash
docker compose --profile tools up -d adminer
```

Then open the pre-filled link — driver, host, user and database are all set, so
only the password (`DB_PASSWORD`, `nyumba` by default) is needed:

**http://localhost:8080/?pgsql=host.docker.internal&username=nyumba&db=nyumba**

The `tools` profile keeps Adminer out of a plain `docker compose up`. Point it at
a different Postgres with `ADMINER_TARGET` in `.env`:

| Value | Reaches |
|-------|---------|
| `db` | the `db` service in `docker-compose.yml` (default) |
| `host.docker.internal` | a Postgres installed on your host, e.g. `brew services start postgresql@18` |

> Only run **one** of those two at a time — both bind `:5432`, and a host
> Postgres wins for `localhost` connections while the container claims the
> external interface. That split is confusing to debug.

Stop it with `docker compose --profile tools down`.

## Auth

Every route requires a bearer access token unless it is marked `@Public()`;
routes additionally declare `@Permissions('resource.action')` for RBAC. Both
guards are registered globally, so a new controller is protected by default.

**Signing in.** After `npm run seed`, the seeded accounts share the password
`Nyumba#2026` (development only):

| Email | Role |
|-------|------|
| `samira@nyumba.co.tz` | Super Admin |
| `khalid@nyumba.co.tz` | Property Manager |
| `asha@nyumba.co.tz` | Accountant |
| `hamisi@nyumba.co.tz` | Maintenance Staff |

On an **unseeded** database, `POST /api/auth/register` creates the first
account as Super Admin and installs the built-in roles. It returns 409 once any
user exists — after that, accounts come from `POST /api/users` invites.

**Flows.** Invites and password resets issue a single-use token. Mail delivery
is a stub ([src/mail/mail.service.ts](src/mail/mail.service.ts)): the link is
logged to the server console, and outside production the token is also returned
as `devToken` so both flows can be completed from Swagger.

```
POST /api/auth/login            → accessToken + refreshToken + user + perms
POST /api/auth/refresh          → rotates the refresh token
POST /api/auth/forgot-password  → issues a reset token
POST /api/auth/reset-password   → consumes it; revokes every session
POST /api/auth/accept-invite    → sets first password, activates, signs in
POST /api/auth/change-password  → requires current password
GET  /api/auth/me               → current user + effective perms
```

Access tokens carry a `tokenVersion`; password changes, resets and suspension
bump it so tokens already in flight stop working immediately. Refresh tokens
rotate, and replaying a spent one revokes the user's whole session family.

## Migrations (schema changes only — `synchronize` is off)

```bash
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
```

## Seed

```bash
npm run seed                  # idempotent, dependency-ordered
```

## Testing

`test/*.e2e-spec.ts` are real integration tests — they boot the actual Nest
app and hit it over HTTP (via `supertest`), against a **dedicated `nyumba_test`
database and `nyumba-documents-test` MinIO bucket**, never the dev ones. This
matters: earlier manual browser testing against the dev database accidentally
terminated a real lease with no way to undo it — these tests exist so that
kind of regression gets caught by the suite instead.

One-time setup:

```bash
createdb -h localhost -U nyumba nyumba_test          # or: psql -c "CREATE DATABASE nyumba_test OWNER nyumba;"
DB_NAME=nyumba_test npm run migration:run
DB_NAME=nyumba_test npm run seed                     # optional — the specs create their own fixtures either way
```

Then, any time:

```bash
npm run test:e2e
```

Coverage today (`test/`): payment recording (balance math, capping, status
transitions), lease termination (occupancy/tenant side effects, refusing a
double-terminate), and document upload (multipart upload, file-type
allowlist, owner-scoped listing, download returns the real bytes, delete).
Every spec creates its own tenants/properties/leases via the API rather than
depending on seeded IDs, so the suite is safe to re-run repeatedly without
resetting the test database.

`npm test` (plain Jest, no config) intentionally does **not** pick up
`*.e2e-spec.ts` — there's no unit-test suite yet, so it currently finds
nothing to run.

## Scripts

| Script | Purpose |
|--------|---------|
| `start:dev` | Watch-mode dev server |
| `build` / `start:prod` | Production build & run |
| `lint` / `format` / `typecheck` | Quality gates |
| `test` | Jest (unit — none written yet) |
| `test:e2e` | Integration tests against `nyumba_test` — see **Testing** above |
| `migration:*` / `seed` | Database lifecycle |
