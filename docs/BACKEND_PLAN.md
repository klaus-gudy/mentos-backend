# Mentos / Nyumba PMS — Backend Execution Plan

> Stack: **NestJS + TypeORM + Postgres** · Auth: **self-hosted JWT + RBAC** · Cadence: **solo, 1-week sprints**

## The core insight

`mentos-frontend/lib/api.ts` **is the API spec** and `mentos-frontend/lib/types.ts`
**is the schema.** The frontend currently talks to an in-memory store; the backend
replaces that store with a real service and the frontend's data hooks are repointed
at HTTP. Every endpoint, its inputs, and its side effects are already written down.

## 3 contract decisions locked before any module (see ARCHITECTURE.md)

| # | Issue | Decision |
|---|-------|----------|
| 1 | **IDs** — FE keys by human-readable strings (`"P-01"`, `"TECH-01"`, `"INV-1015"`) | UUID primary key **+** a `code` column (server-generated per-entity sequence). Serialize `code` as the `id` the FE expects during migration. |
| 2 | **Dates** — FE stores display strings (`"01 Jul 2026"`, `"Today"`) | Store real `date` / `timestamptz`, return ISO, format at the FE edge (`lib/format.ts`). |
| 3 | **Denormalized display fields** — `MaintenanceRequest.assignee` (name), `Property.typeLabel`, `Invoice.items` as tuples | Normalize (FKs / child tables / JSONB) and **compute** display fields in serializers so responses still match the contract. |

**Scope-saver:** the FE does search/sort/pagination client-side (`useListControls`),
so list endpoints return full collections for parity — no server-side pagination early.

## Sprint roadmap (8 × 1-week, solo)

Each sprint is a vertical slice ending in a live demo — a module wired from
Postgres → Nest → the real frontend page.

| Sprint | Theme | Demoable as… |
|--------|-------|--------------|
| **1** | Foundation & DB connection | API boots, connects to Postgres, migrations run, seed loads, Swagger lists it, `/health` pings DB |
| **2** | Auth + RBAC (Users, Roles, JWT, guards, audit interceptor) | Log in on real FE; permissions gate routes; users/roles pages live |
| **3** | Properties + Units | Properties list/detail from DB; add property/unit persists |
| **4** | Tenants + Leases | `createLease` txn: occupies unit, activates tenant, auto-generates first invoice + notification |
| **5** | Invoices + Payments | `recordPayment` decrements balance, flips paid/partial, issues receipt |
| **6** | Maintenance + Technicians | Full state machine (open→closed) + category-to-skill assignment |
| **7** | Documents, Notifications, Templates, Audit log | Notifications populate from events; upload works; audit log live |
| **8** | Reports + hardening | 10 reports from live data; tests, Swagger polish, Dockerized deploy |

Sequencing: auth first (everything needs the guard + audit interceptor), then
entities in dependency order (Property → Unit → Tenant → Lease → Invoice → Payment),
then operations, then cross-cutting/read-heavy layers.

## Domain surface (from the frontend)

**15 entities:** Property, Unit, Tenant, Lease, Invoice, Payment, MaintenanceRequest,
Technician, Document, User, Role, Notification, AuditEntry, NotifPrefs, Template.

**Non-trivial business logic to port from `lib/api.ts`:**
- `createLease` → occupy unit + activate tenant + generate first invoice + notification
- `recordPayment` → decrement balance, set paid/partial, emit receipt + notification
- Maintenance state machine: open → assigned → in_progress → completed → closed
- `assignMaintenance` → category-to-skill technician matching
- RBAC `resource.action` catalog (13 resources), roles, per-role perm sets
- Audit entry emitted on nearly every mutation

---

## Sprint 1 — Foundation & DB Connection

**Goal:** Stand up the NestJS + TypeORM service connected to Postgres, with a working
migration flow and the entity/response conventions every later module inherits.

### Capacity
| Person | Available Days | Allocation | Notes |
|--------|---------------|------------|-------|
| You | 4 of 5 | ~7 pts | 1 pt ≈ ½ day; ~1 day reserved for interrupts. Planning to ~75%. |

### Backlog
| Priority | Item | Est |
|----------|------|-----|
| P0 | Scaffold Nest app + `@nestjs/config` with env-schema validation | 1 pt |
| P0 | Postgres via `docker-compose` + TypeORM `DataSource` connecting | 1 pt |
| P0 | Base conventions: `BaseEntity` (UUID PK, timestamps), ID + date policy | 1 pt |
| P0 | Migration workflow (`migration:generate`/`run`, no `synchronize`) | 1 pt |
| P0 | Global `ValidationPipe`, exception filter, response envelope, serializer | 1 pt |
| P0 | Seed runner scaffold (idempotent, ordered) + ported seed data constants | 2 pt |
| P1 | Swagger/OpenAPI at `/docs` | ½ pt |
| P1 | `/health` with DB ping (`@nestjs/terminus`) | ½ pt |
| P2 | *(stretch)* Dockerfile + CI lint/build | 1 pt |

### Definition of Done
- [ ] `docker compose up` → Postgres up; `npm run start:dev` connects with zero errors
- [ ] `npm run migration:run` creates schema; `npm run seed` loads it idempotently
- [ ] `/health` returns DB-up; `/docs` renders
- [ ] `ARCHITECTURE.md` records the ID, date, and denormalization decisions
- [ ] Committed on a branch (nothing pushed unless approved)

### Risks
| Risk | Mitigation |
|------|------------|
| ID/date decisions made ad-hoc later | Locked Day 1 in `ARCHITECTURE.md` |
| Seed port balloons (15 entities) | Seed *runner* now; per-entity data lands with each entity |
| `synchronize: true` left on | Migrations-only from the start; explicit DoD item |
| Solo interrupts from live frontend | 75% capacity buffer |
