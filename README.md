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

## Scripts

| Script | Purpose |
|--------|---------|
| `start:dev` | Watch-mode dev server |
| `build` / `start:prod` | Production build & run |
| `lint` / `format` / `typecheck` | Quality gates |
| `test` | Jest |
| `migration:*` / `seed` | Database lifecycle |
