---
labels: ready-for-agent
---

# Fix the persistence review findings, and test the API against mocked ports

## Problem Statement

Usuarios and Sesiones now persist in Postgres through Prisma, on top of the clean-architecture rebuild (ADR 0001, ADR 0004). This work is still uncommitted. A two-axis code review of it (standards and spec) found problems that make the code harder to trust and to work on:

- **In-memory repositories are dead weight in production code.** They exist only so the tests can run without a database. They make the test suite depend on hand-written fakes of Postgres behaviour, such as email uniqueness and id generation, rather than on the contract of each port.
- **The Prisma adapters have no automated test.** Their only logic is translating Prisma errors into domain errors, hashing Sesión ids and mapping rows, and it was checked once, by hand.
- **Errors lose their cause.** Vendor errors are translated into domain errors without `cause`, which the architecture rules require. Any error that isn't translated escapes the adapter as a raw vendor error.
- **Row mapping is loose.** A database row is spread straight into the domain User, so a new column would leak into the domain unnoticed.
- **A fresh clone doesn't build or test.** The generated Prisma client is gitignored, and nothing generates it.
- **A build artifact (`*.tsbuildinfo`) isn't gitignored.**
- **The schema uses a word the glossary avoids.** A Servicio that is dado de baja is flagged `active = false`. The glossary lists *desactivar* under *Avoid*, and "Dar de baja" maps to `retire`.
- **Sucursal opening hours are free-form strings.** The database would accept `"25:00"`.
- **ADR 0004 names error codes the adapters never see.** It says repositories must catch Postgres codes `23P01`/`23505`, but through Prisma's `pg` driver adapter they arrive as Prisma errors.

## Solution

The in-memory repositories are deleted. The HTTP specs keep testing the full app through its HTTP boundary, but every outward port except the Clock is a Jest mock that each test scripts. The Prisma adapters get their own specs against a mocked Prisma client, and the real password hasher gets a minimal spec. `npm test` still needs no database.

The adapters translate known Prisma errors into domain errors with `cause`, and wrap everything else in a new `DatabaseOperationError`. Rows are mapped to domain objects field by field. The Prisma client is generated on install, and build artifacts are gitignored.

The schema renames the Servicio flag to a timestamp of when it was dado de baja, stores Sucursal hours as a native Postgres `time`, and the single `init` migration is rewritten for both. ADR 0004 is corrected to name the error shapes the adapters actually receive.

## User Stories

1. As a developer, I want the in-memory repositories removed from the codebase, so that production code contains only adapters that production uses.
2. As a developer, I want the HTTP specs to replace the Usuarios repository, the Sesiones repository and the password hasher with Jest mocks, so that each test states exactly what the outside world returns.
3. As a developer, I want the Clock to remain the controllable test Clock, so that expiry tests can still advance time.
4. As a developer, I want `npm test` to pass with no Postgres running and no `DATABASE_URL` set, so that tests are fast and run anywhere.
5. As a developer, I want each HTTP spec to exercise one request against the full app, so that DTO validation, the Sesión guard, the exception filter and presenters stay covered.
6. As a developer, I want a spec proving that sign-up passes the trimmed name, the trimmed and lowercased email, and the hashed (never the plain) password to the Usuarios repository, so that normalisation and hashing are covered without a database.
7. As a developer, I want a spec proving that sign-up answers 409 when the Usuarios repository throws `ConflictError`, so that duplicate emails map to the right status.
8. As a developer, I want a spec proving that sign-up responds with `{ sessionId, expiresAt }`, where the expiry is 30 days after the Clock's now, so that the Sesión contract holds.
9. As a developer, I want specs proving that sign-up rejects a blank name, a malformed email and a password outside 12–72 characters with 400, and never reaches the repositories, so that validation is covered.
10. As a developer, I want a spec proving that sign-in returns a new Sesión when the password hasher verifies the password, so that the happy path is covered.
11. As a developer, I want a spec proving that an unknown email and a wrong password produce identical 401 responses, so that registered emails can't be probed.
12. As a developer, I want a spec proving that sign-in still hashes once when the email is unknown, so that response timing doesn't reveal registered emails.
13. As a developer, I want specs proving that endpoints needing a Sesión return 401 for:
    - a missing Authorization header;
    - a Sesión id sent without the Bearer scheme;
    - an unknown Sesión;
    - a Sesión 30 days past issue;

    and accept a Sesión just before that, so that the guard's rules are covered.
14. As a developer, I want a spec proving that signing out deletes the current Sesión through the Sesiones repository and answers 204, so that sign-out is covered.
15. As a developer, I want specs proving that `GET /users/me` returns `{ id, name, email, role }` and never `passwordHash`, so that no credential leaks.
16. As a developer, I want specs proving that `PATCH /users/me` passes only the sent fields, normalised, to the Usuarios repository, and answers 409 when it throws `ConflictError`, so that profile edits are covered.
17. As a developer, I want the CORS spec kept, so that the front can keep calling the API.
18. As a developer, I want a spec for the real scrypt password hasher proving that a password verifies against its own hash and a wrong password doesn't, so that the adapter is still tested once it leaves the HTTP specs.
19. As a developer, I want specs for the Prisma Usuarios repository against a mocked Prisma client, so that its behaviour is checked without a database.
20. As a developer, I want a spec proving that the Prisma Usuarios repository turns a Prisma unique-constraint error (`P2002`) into `ConflictError`, and a record-not-found error (`P2025`) into `NotFoundError`, each keeping the original error as `cause`, so that translation is covered.
21. As a developer, I want a spec proving that any other Prisma or unknown error becomes `DatabaseOperationError`, with the original as `cause`, so that no vendor error escapes an adapter.
22. As a developer, I want a spec proving that the Prisma Usuarios repository returns only the domain User's fields, even when the row has extra columns, so that the domain shape is deliberate.
23. As a developer, I want a spec proving that the Prisma Sesiones repository stores only the SHA-256 of the Sesión id, never the id itself, so that a leaked table can't be used to impersonate anyone.
24. As a developer, I want a spec proving that the Prisma Sesiones repository returns the raw id from `create` and `findById`, returns null for an unknown Sesión, and deletes by the hashed id without failing when the Sesión is already gone, so that the port contract holds.
25. As a developer, I want the Prisma Sesiones repository to wrap every Prisma error, a broken foreign key (`P2003`) included, in `DatabaseOperationError` with `cause`, so that it follows the same error rule.
26. As an operator, I want a database failure to answer a generic 500 that doesn't reveal the vendor message, so that internals don't leak.
27. As a developer cloning the repo, I want `npm install` to generate the Prisma client, so that `npm test` and `npm run build` work straight away.
28. As a developer, I want `*.tsbuildinfo` files gitignored, so that build artifacts are never committed.
29. As a Dueño, I want the moment a Servicio was dado de baja to be recorded, so that later cascades (ticket 07) can reason about it.
30. As a developer, I want the Servicio flag named after the glossary, "dar de baja" → `retire`, so that code and glossary use one vocabulary.
31. As a developer, I want the name of a Servicio that was dado de baja to be reusable, while two Servicios not dados de baja in the same Negocio still can't share a name in any casing, so that ticket 02's rule still holds after the rename.
32. As a Dueño, I want the database to reject impossible Sucursal hours, so that corrupted hours can't be stored.
33. As a developer, I want the project to keep a single, clean `init` migration, so that the first commit of the schema is easy to read.
34. As a future implementer of tickets 02, 03 and 06, I want ADR 0004 to state exactly how constraint violations reach the adapter, so that I catch the right error.

## Implementation Decisions

**Tests and mocks**
- The in-memory Usuarios and Sesiones repositories are deleted. Production wiring binds only the Prisma adapters.
- The shared test-app helper keeps building the full app through the same setup function as the entry point, as ADR 0001 and ticket 01 require. It overrides:
  - the Usuarios repository, the Sesiones repository and the password hasher, each with an object of `jest.fn()` methods that the test can script and inspect;
  - the Clock, with the existing controllable test Clock.

  The helper returns the mocks alongside the app. Plain `jest.fn()` is used, with no new mocking dependency.
- Multi-step flows (sign up → sign in → sign out) are rewritten as single-request specs. Behaviour that used to come from the fakes, such as email uniqueness or "a signed-out Sesión stays signed out", is now asserted as a port interaction plus a status mapping. The real guarantee lives in Postgres and the Prisma adapter specs.

**Errors**
- `DatabaseOperationError` is added to the domain errors. The exception filter needs no change: unmapped domain errors already become 500. The adapter gives it a generic message, never the vendor text.
- Domain errors take `cause` through the standard `ErrorOptions`. To type-check it, the TypeScript `lib` moves to ES2022, and the compile `target` stays ES2021. Raising the target to ES2022 would switch on `useDefineForClassFields` and change how decorated DTO and provider fields are emitted, which isn't wanted here.
- The Prisma Usuarios repository translates:
  - `P2002` → `ConflictError`;
  - `P2025` → `NotFoundError`;
  - anything else → `DatabaseOperationError`.

  Each keeps the original error as `cause`, and every Prisma call in the adapter goes through this translation, reads included. The Prisma Sesiones repository translates every error to `DatabaseOperationError`. Its `delete` stays idempotent (delete-many by hashed id).

**Mapping and setup**
- Row-to-domain mapping lists the domain fields explicitly (`id`, `name`, `email`, `passwordHash`, `role`, `createdAt` for User; `id`, `userId`, `expiresAt` for Session) instead of spreading the row.
- A `postinstall` script runs `prisma generate`. `*.tsbuildinfo` is gitignored.

**Schema**
- `Service.active Boolean` becomes `Service.retiredAt DateTime?` (`timestamptz`), where null means not dado de baja. The case-insensitive name index becomes unique on `(businessId, lower(name))` where `retiredAt` is null. The glossary mapping table in `docs/agents/domain.md` gets `Service.retiredAt` on the "Dar de baja" row.
- `Branch.opensAt` and `Branch.closesAt` become Postgres `time(0)`. Prisma exposes them as a `Date` on 1970-01-01 in UTC. The connection is already pinned to UTC for this reason. The future Sucursal adapter (ticket 02) converts `HH:mm` to and from that `Date`; no Sucursal adapter exists yet, so only the schema changes now.
- The `init` migration is regenerated from the updated schema, and its hand-written SQL is re-appended: `btree_gist`, the Turno overlap exclusion constraint, and both case-insensitive unique indexes, with the Service index now filtered on `retiredAt` being null. The local database is reset with `prisma migrate reset`. Nothing is committed, and the local database holds no data.
- Afterwards, `prisma migrate diff` from the migrated database to the schema must still report an empty migration.

**ADR 0004** is corrected with what was observed through Prisma 7.10 and `@prisma/adapter-pg`:
- a unique-index violation arrives as `PrismaClientKnownRequestError` with code `P2002`, and the violated index's name is in `meta.driverAdapterError.cause.constraint.index`;
- the Turno overlap exclusion violation arrives as `PrismaClientKnownRequestError` with the generic code `P2039`, and can only be recognised by `meta.driverAdapterError.cause.originalCode === '23P01'` (or the constraint name `Booking_no_overlap` in the message);
- a foreign-key violation arrives as `P2003`.

Its wording about "active Servicios" changes to Servicios that are not dados de baja.

## Testing Decisions

**What makes a good test here.** A test checks behaviour visible at a seam: HTTP status and body, what reaches a port and what a port's answer turns into. It doesn't check how a use case is written internally. Asserting calls on a port mock is legitimate, because the port is the boundary. Asserting calls between internal classes isn't.

**Seams**, as agreed with the user, highest first:
1. **The HTTP boundary** of the full app, via supertest and the shared setup function, with the Usuarios repository, the Sesiones repository and the password hasher mocked, and the test Clock. This seam already exists; it replaces the in-memory fakes with mocks.
2. **Each Prisma adapter's public port interface**, against a mocked Prisma client that exposes only the model methods the adapter calls. This seam is new, and needed because no in-memory twin remains to compare against.
3. **The scrypt password hasher's own interface**, with real crypto and no mocks.

**Modules tested:**
- Sign-up, profile and CORS behaviour, in the Usuarios HTTP spec;
- sign-in, sign-out and the Sesión guard, in the Sesiones HTTP spec;
- the Prisma Usuarios repository;
- the Prisma Sesiones repository;
- the scrypt password hasher.

**Prior art:** the existing co-located `*.http.spec.ts` files and the shared test-app helper, which already override the Clock via `overrideProvider`. Their case lists (400/401/409 cases, 30-day expiry boundaries, the CORS check) are the checklist for the rewritten specs.

All specs stay co-located `.spec.ts` files, per ADR 0001. `npm test`, `npm run lint` and `npm run build` must pass, with `DATABASE_URL` unset for `npm test`.

## Out of Scope

- **Lint protection for the generated Prisma client.** It lives outside `infrastructure/`, and the domain and application lint rules don't forbid importing it, `@prisma/*` or `pg`. The user chose to leave this unprotected.
- **`P2002` always meaning "Email already registered".** The Usuarios adapter maps every `P2002` to that message, which is correct only while email is User's sole unique column. The user chose to leave this as is. The constraint name is available in `meta.driverAdapterError.cause.constraint.index` if it's ever needed.
- **Purging expired Sesiones.** They stay rejected but not deleted, as the existing `ponytail:` comment notes.
- **Exporting `PrismaService` from the global infrastructure module.** Only the two adapters use it.
- **The existing `allowScripts` block in `package.json`,** which npm needs to run Prisma's install scripts; **`dotenv` as a runtime dependency; and `timestamptz` on every date column.** All stay as they are.
- **Implementing tickets 02–07.** That includes the Sucursal adapter's `HH:mm` ↔ `time` conversion and setting `retiredAt` from the Clock when a Servicio is dado de baja.
- **Any test against a real database.**

## Further Notes

- The Prisma persistence this spec builds on is itself uncommitted. It comprises the Prisma schema and `init` migration, `PrismaService`, the two Prisma adapters, dotenv loading in the entry point, the UTC-pinned connection, and ADR 0004. Commit it together with this work or before it.
- The UTC pin on the `pg` driver adapter connection must stay. Without it, `@prisma/adapter-pg` sends `DateTime` values without an offset, and a Postgres server in a non-UTC zone (the dev server is `America/Buenos_Aires`) stores every instant shifted.
- Postgres 18 runs locally on port 5432, with database `agendic` and the `btree_gist` extension available.
