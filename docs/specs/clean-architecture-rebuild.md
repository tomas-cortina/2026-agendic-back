---
labels: ready-for-agent
---

# Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno

## Problem Statement

The API is four NestJS CRUD modules (services, professionals, reservations, users) whose service classes mix HTTP exceptions, business rules and in-memory arrays. It does not model the product described in the shared glossary (`../2026-agendic-front/CONTEXT.md`):

- There is no Negocio, Sucursal, Dueño or Especialidad, so every Servicio and Profesional floats free of any Negocio, and any Profesional can be booked for any Servicio.
- A Turno is booked by an anonymous name and email instead of a Cliente.
- `GET /users` lists every Usuario, with plaintext passwords, to anyone.
- Nothing authenticates, so no rule can say "only the Dueño may do this".
- Dar de baja a Servicio breaks later bookings: the overlap check looks up the retired Servicio and throws "not found" for any new Turno with a Profesional who had one.
- Editing a Servicio's duration silently stretches every Turno already booked for it.
- Features reach into each other's concrete classes, and business logic cannot move off in-memory storage without being rewritten.

## Solution

Rebuild the API on clean/hexagonal architecture over NestJS-native DI (ADR 0001), with the domain model from the agreed Prisma draft translated to English identifiers (ADR 0003), and in-memory adapters until a database lands. The back becomes the system of record for Usuarios (ADR 0002).

A visitor signs up and gets a Sesión. Any Usuario can create a Negocio and becomes its Dueño. The Dueño adds Sucursales with opening hours, Servicios, and Profesionales (existing Usuarios, added by email). A Cliente browses the public catalog and books a Turno that the API validates: right Negocio, Profesional works at that Sucursal, within opening hours, no overlap, not in the past. Dar de baja a Servicio or a Profesional cancels their future Turnos in that Negocio and reports how many. No response ever exposes a password.

## User Stories

### Usuario and Sesión

1. As a visitor, I want to sign up with my name, email and password, so that I can use Agendic.
2. As a visitor, I want my email trimmed and lowercased and my name trimmed on sign-up, so that I can't accidentally register twice with different casing.
3. As a visitor, I want a clear validation error when my email is malformed, my name is blank, or my password is not 12–72 characters, so that I know what to fix.
4. As a visitor, I want a conflict error when my email is already registered, so that I know to sign in instead.
5. As a visitor, I want to receive a Sesión right after signing up, so that I don't have to sign in again.
6. As a Usuario, I want to sign in with my email and password and receive a Sesión, so that I can act on my account.
7. As a Usuario, I want one generic error whether my email or my password is wrong, so that nobody can probe which emails are registered.
8. As a Usuario, I want to sign out, so that my Sesión stops working on a shared device.
9. As a Usuario, I want my Sesión to expire 30 days after it was issued, so that a leaked Sesión id isn't valid forever.
10. As a Usuario, I want a 401 when I call an endpoint that needs a Sesión without one, or with an unknown, expired or signed-out one, so that the front knows to send me to sign in.
11. As a Usuario, I want to see my own profile, so that I can check my details.
12. As a Usuario, I want to change my name and email with the same validation and uniqueness rules as sign-up, so that my profile stays current.
13. As a Usuario, I want my password or its hash never to appear in any response, so that a leak of API responses never exposes credentials.
14. As a Usuario, I want nobody else to be able to list Usuarios or read another Usuario's profile, so that my email stays private.
15. As an operator, I want the first Administrador seeded at startup from `ADMIN_EMAIL` and `ADMIN_PASSWORD`, so that someone can manage the Especialidad catalog.

### Negocio

16. As a Usuario, I want to create a Negocio with a name and description and become its Dueño, so that I can publish my agenda.
17. As a Usuario, I want to be Dueño of several Negocios, so that I can manage all my businesses from one account.
18. As a Dueño, I want to edit my Negocio's name and description, so that my public page stays accurate.
19. As a Usuario, I want a 403 when I try to edit or manage a Negocio I don't own, so that no one can tamper with someone else's agenda.
20. As a visitor, I want to list Negocios and view one without a Sesión, so that I can explore before signing up.

### Sucursal

21. As a Dueño, I want to create a Sucursal in my Negocio with a name, address, opening time and closing time (`HH:mm`), so that Clientes know where and when they can be served.
22. As a Dueño, I want a validation error when the times aren't `HH:mm`, when closing isn't after opening, or when the hours would cross midnight, so that no Sucursal has impossible hours.
23. As a Dueño, I want to edit a Sucursal's name, address and hours, so that I can keep up with real-world changes.
24. As a Dueño, I want Turnos already booked to stay valid when I shorten a Sucursal's hours, and only new Turnos outside the new hours to be rejected, so that editing hours never silently cancels Clientes.
25. As a visitor, I want to list a Negocio's Sucursales without a Sesión, so that I can choose where to book.

### Especialidad

26. As an Administrador, I want to add Especialidades to a catalog shared by the whole platform, with names unique regardless of casing, so that Profesionales describe themselves consistently.
27. As a Usuario who isn't an Administrador, I want a 403 when I try to add an Especialidad, so that the catalog stays curated.
28. As a visitor, I want to list the Especialidades without a Sesión, so that I can see what kinds of Profesionales exist.

### Servicio

29. As a Dueño, I want to create a Servicio in my Negocio with a name, optional description, duration (whole minutes, at least 1) and price (not negative), so that Clientes can book it.
30. As a Dueño, I want Servicio names to be unique, regardless of casing, among my Negocio's active Servicios, while other Negocios can reuse the same names, so that my catalog is unambiguous without blocking anyone else.
31. As a Dueño, I want to edit a Servicio, so that I can adjust its price, description or duration.
32. As a Cliente, I want my already-booked Turno to keep its original end time when the Dueño changes the Servicio's duration, so that my Turno never changes behind my back.
33. As a Dueño, I want to dar de baja a Servicio so that it can no longer be booked, and to be told how many future Turnos were cancelled, so that I know the impact.
34. As a Dueño, I want Turnos that have already started or already happened to be untouched when I dar de baja a Servicio, so that history and in-progress work stay intact.
35. As a Dueño, I want dar de baja a Servicio to be final, with no reactivation, and I accept that, so that the rule stays simple (the front warns before confirming).
36. As a visitor, I want to list a Negocio's active Servicios without a Sesión, so that I can choose what to book.

### Profesional

37. As a Dueño, I want to add a Profesional to one of my Sucursales by the Usuario's email, so that they can receive Turnos there.
38. As a Dueño, I want a clear error when that email has no account in Agendic, so that I know to ask them to sign up first.
39. As a Dueño, I want to add a Usuario who is already a Profesional at another Negocio and reuse their existing profile, so that Profesionales can work at several Negocios.
40. As a Dueño, I want to remove a Profesional from one of my Sucursales and have their future Turnos at that Sucursal cancelled, so that nobody is booked where they no longer work.
41. As a Dueño, I want to dar de baja a Profesional from my Negocio, unlinking them from all my Sucursales and cancelling their future Turnos in my Negocio only, so that they leave my Negocio without losing their account or their work elsewhere.
42. As a Profesional, I want my Turnos at other Negocios to stay intact when one Negocio da de baja me, so that one employer can't disrupt another.
43. As a Profesional, I want to edit my own phone and choose my Especialidades from the catalog, so that my profile is accurate everywhere I work.
44. As a Dueño, I want to be unable to edit a Profesional's profile, so that one Negocio can't overwrite what other Negocios see.
45. As a visitor, I want to list a Negocio's Profesionales with their name, Especialidades and the Sucursales they work at, without a Sesión and without their email or phone, so that I can choose who to book without seeing private data.

### Turno

46. As a Cliente, I want to book a Turno by choosing a Sucursal, Profesional, Servicio and start time, so that I have a place in the agenda.
47. As a Cliente, I want the Turno rejected when the Servicio belongs to another Negocio or has been dado de baja, so that I only book what the Sucursal actually offers.
48. As a Cliente, I want the Turno rejected when the Profesional doesn't work at that Sucursal, so that I'm never booked with someone who won't be there.
49. As a Cliente, I want the Turno rejected when it doesn't fit entirely within the Sucursal's hours (Argentina time), so that I never arrive to a closed door.
50. As a Cliente, I want a conflict error when the Profesional already has an overlapping Turno at any Sucursal of any Negocio, so that nobody is double-booked.
51. As a Cliente, I want a Turno that starts exactly when another ends to be allowed, so that back-to-back Turnos work.
52. As a Cliente, I want the Turno rejected when its start time is in the past, so that the agenda only holds bookable times.
53. As a Cliente, I want my Turno's end time fixed when I book (start plus the Servicio's duration), so that it never changes afterwards.
54. As a Cliente, I want a cancelled Turno to free its time slot, so that someone else can book it.
55. As a Cliente, I want to list my own Turnos, including cancelled ones, so that I can see my upcoming and past visits and any cancellations.
56. As a Dueño, I want to list every Turno in my Negocio, so that I can run my agenda.
57. As a Usuario, I want a 403 when I try to list the Turnos of a Negocio I don't own, so that Clientes' bookings stay private.

### Architecture

58. As a developer, I want the domain to depend only on ports and never on infrastructure or NestJS, and I want lint to fail if it does, so that the rule is kept mechanically.
59. As a developer, I want every repository port to be async and to generate ids and timestamps itself, so that a Prisma adapter can replace the in-memory one by changing only the adapter and its module binding.
60. As a developer, I want domain errors translated to HTTP status codes in one exception filter, so that use cases never know about HTTP.
61. As a developer, I want every response to go through a presenter that lists its fields explicitly, so that new entity fields never leak by accident.
62. As a developer, I want "now" to come from a Clock port, so that time-dependent rules can be tested deterministically.
63. As a developer, I want the old `services`, `professionals`, `reservations` and `users` modules and the hello-world controller removed, so that only one architecture remains.

## Implementation Decisions

### Architecture (ADR 0001)

- Three layers, each split into feature subfolders:
  - **domain**: entities, domain errors, ports (repository and capability interfaces, each exported with its injection token) and domain DTOs (use-case inputs).
  - **application**: one use case per operation, each an `@Injectable()` class.
  - **infrastructure**: in-memory repository adapters, capability adapters (password hasher, clock), class-validator HTTP DTOs, and REST controllers, presenters and NestJS modules per feature. These are aggregated into one infrastructure module that the app module imports.
- Dependency rule: domain imports nothing from application, infrastructure or any `@nestjs/*` package. Application may import domain, plus `@nestjs/common` only for `Injectable` and `Inject`. Infrastructure may import both. This is enforced with oxlint `no-restricted-imports` using per-folder overrides.
- Use cases depend on ports through injection tokens, never on concrete classes, and never call another use case.
- Authentication is an HTTP concern. A guard resolves `Authorization: Bearer <sessionId>` through a validate-session use case and passes the resulting Usuario id to controllers. Authorization ("is this Usuario the Dueño?", "is this Usuario an Administrador?") lives inside use cases.
- The app is configured by one shared setup function, used by both `main.ts` and the tests. It applies the global validation pipe (whitelist, forbid non-whitelisted fields, transform), the domain-exception filter and CORS.
- Operations that write several aggregates (the cascades) are a single use case, because the cascade is part of what "dar de baja" means. Mark them with a `ponytail:` comment: they need a transaction once a database lands.

### Identifiers (ADR 0003)

English everywhere in code, one identifier per glossary term, using the mapping table in `docs/agents/domain.md`: Negocio `Business`, Dueño `owner`, Sucursal `Branch`, Usuario `User`, Administrador `Role.ADMIN`, Cliente `client`, Profesional `Professional`, Especialidad `Specialty`, Servicio `Service`, Turno `Booking`, Reservar `book`, Cancelar `cancel`, Dar de baja `retire`, Sesión `Session`.

### Domain model (translated from the agreed Prisma draft)

- **User**: id, name, email (unique across the platform), passwordHash, role (`ADMIN` or `USER`, default `USER`), createdAt. Has no active flag and cannot be deleted.
- **Session**: id (random), userId, expiresAt (30 days after issue).
- **Business**: id, name, description, ownerId. Has no active flag and cannot be deleted.
- **Branch**: id, businessId, name, address, opensAt and closesAt (`HH:mm`, opensAt < closesAt, same day), plus the set of Professionals working there (many-to-many).
- **Service**: id, businessId, name, description (optional), durationMinutes (≥ 1), price (≥ 0), isActive.
- **Specialty**: id, name (unique regardless of casing). The catalog is global.
- **Professional**: id, userId (unique: one Professional profile per User), phone (optional), Specialties (many-to-many), Branches (many-to-many; these can belong to different Businesses). It has **no active flag**: the draft's `activo` is dropped, because dar de baja unlinks per Business.
- **Booking**: id, clientId (a User), branchId, professionalId, serviceId, startsAt, endsAt (fixed at booking), status (`BOOKED` or `CANCELLED`), createdAt.
- Ids are integers generated by the repositories. The in-memory adapters use a counter.
- Deliberately omitted until their features exist: `googleRefreshToken`, `googleEventId`, Rubro.

### Ports

- Repositories, all async: users, sessions, businesses, branches, specialties, services, professionals, bookings.
- The bookings repository exposes the queries the rules need:
  - `BOOKED` bookings of a Professional overlapping an interval, across all Branches.
  - Bookings by client.
  - Bookings by Business.
  - Cancel `BOOKED` bookings starting after a given instant, filtered by Service, or by Professional plus a set of Branches. Returns the count cancelled.
- `PasswordHasher`: hash and verify. The adapter uses scrypt from `node:crypto`, with no new dependency.
- `Clock`: `now()`. The adapter returns the system time; tests override it.

### Use cases

- **Sign-up, sign-in, sign-out, validate-session**: sign-up and sign-in both return a Session. Sign-in failures for an unknown email and for a wrong password are indistinguishable.
- **Get me, update me.**
- **Businesses**: create, update, list, get.
- **Branches**: create, update, list by Business.
- **Specialties**: create (Administrador only), list.
- **Services**: create, update, retire, list active by Business.
- **Professionals**:
  - Add to Branch: by email; creates the profile on first use.
  - Remove from Branch: cancels future Bookings at that Branch.
  - Retire from Business: unlinks from all of that Business's Branches and cancels future Bookings at them.
  - Update own profile.
  - List by Business.
- **Bookings**: book, list mine, list by Business (Dueño only).

### Booking rules (all enforced by the book use case)

1. The Service belongs to the same Business as the Branch and is active.
2. The Professional works at that Branch.
3. startsAt is not before now (per Clock).
4. `endsAt = startsAt + Service.durationMinutes`, computed and stored once, at booking time.
5. The Booking fits within the Branch's hours: local start ≥ opensAt and local end ≤ closesAt, on the same local day. All Branches use the `America/Argentina/Buenos_Aires` time zone. Mark this with a `ponytail:` comment: add a per-Branch time zone if a Branch ever opens outside Argentina.
6. The Professional has no `BOOKED` Booking overlapping `[startsAt, endsAt)` at any Branch of any Business. Intervals are half-open, so back-to-back Bookings are allowed. The same Cliente having overlapping Bookings is not checked.

### Cascades

- "Future" means `startsAt > now` per Clock. Bookings that are in progress or already past are never cancelled.
- **Retire Service**: set isActive to false and cancel that Service's future Bookings. Responds `{ id, cancelledBookings }`.
- **Retire Professional from a Business**: unlink them from every Branch of that Business and cancel their future Bookings at those Branches. Responds `{ cancelledBookings }`.
- **Remove Professional from a Branch**: the same, for that one Branch.
- Changing a Branch's hours or a Service's duration never touches existing Bookings.

### Uniqueness

- User email: unique across the platform, stored trimmed and lowercased.
- Service name: unique per Business among active Services, regardless of casing.
- Specialty name: unique globally, regardless of casing.

### HTTP contract

Requests authenticate with `Authorization: Bearer <sessionId>`. Endpoints marked *public* need no Sesión.

- **Usuario and Sesión**:
  - `POST /users`: sign-up, public. Returns `{ sessionId, expiresAt }`.
  - `POST /sessions`: sign-in, public. Returns `{ sessionId, expiresAt }`.
  - `DELETE /sessions/current`: sign-out.
  - `GET /users/me` and `PATCH /users/me` (name and email). `GET /users` and `GET /users/:id` are removed.
- **Negocio**:
  - `POST /businesses`, `PATCH /businesses/:id` (Dueño).
  - `GET /businesses` and `GET /businesses/:id`: public.
- **Sucursal**:
  - `POST /businesses/:id/branches` (Dueño), `PATCH /branches/:id` (Dueño).
  - `GET /businesses/:id/branches`: public.
- **Especialidad**:
  - `POST /specialties` (Administrador).
  - `GET /specialties`: public.
- **Servicio**:
  - `POST /businesses/:id/services` (Dueño), `PATCH /services/:id` (Dueño).
  - `DELETE /services/:id` (Dueño): retire; returns `{ id, cancelledBookings }`.
  - `GET /businesses/:id/services`: public, active Services only.
- **Profesional**:
  - `POST /branches/:id/professionals` with `{ email }` (Dueño).
  - `DELETE /branches/:id/professionals/:professionalId` (Dueño): returns `{ cancelledBookings }`.
  - `DELETE /businesses/:id/professionals/:professionalId` (Dueño): returns `{ cancelledBookings }`.
  - `PATCH /professionals/me` with phone and specialtyIds.
  - `GET /businesses/:id/professionals`: public.
- **Turno**:
  - `POST /bookings`.
  - `GET /me/bookings`.
  - `GET /businesses/:id/bookings` (Dueño).

### Presenters (explicit field lists)

- **User**: `{ id, name, email, role }`. Never passwordHash.
- **Public Professional**: `{ id, name, specialties: [{ id, name }], branchIds }`. Never email or phone.
- **Booking**: `{ id, branchId, professionalId, serviceId, startsAt, endsAt, status }`, with dates as ISO strings.
- **Business**, **Branch**, **Service** and **Specialty** each list their fields explicitly.

### Domain errors → HTTP status

| Status | Errors |
| --- | --- |
| 400 | Input validation (validation pipe) |
| 401 | Unauthenticated |
| 403 | Forbidden: not the Dueño, not an Administrador |
| 404 | Not found |
| 409 | Conflict: email taken, duplicate Service or Specialty name, overlapping Booking |
| 422 | Business-rule violation: outside hours, in the past, Professional not at the Branch, Service from another Business or retired, email without an account when adding a Professional |

A failed sign-in is always a generic 401.

### Validation (HTTP DTOs, class-validator)

- Email: valid, trimmed and lowercased.
- Name: trimmed and non-empty.
- Password: 12–72 characters, the same rules as the front.
- Duration: integer, at least 1.
- Price: number, not negative.
- Times: `HH:mm`.
- IDs: positive integers.

### Build order (one ticket and one PR each)

1. **Usuario**, together with the shared pieces: domain errors, exception filter, shared app setup, Clock, lint rule, infrastructure module, removal of the old modules, Administrador seed.
2. **Sesión**, with the auth guard.
3. **Negocio**.
4. **Sucursal**.
5. **Especialidad**.
6. **Servicio**: retiring works here, but has no Bookings to cancel yet.
7. **Profesional**: removal and retirement unlink here, but have no Bookings to cancel yet.
8. **Turno**: booking rules, booking lists, and the three cascades wired into retire Service, remove Professional from Branch, and retire Professional from Business.

## Testing Decisions

- **One seam: HTTP.** Each feature is tested with supertest against the full app module, configured by the same shared setup function as `main.ts` and backed by the in-memory adapters. The only override is the Clock port, replaced by a controllable clock (fixed, and advanceable within a test). Spec files are co-located with each feature's REST module and named `*.http.spec.ts`, so `npm test` runs them (jest `rootDir: src`, `*.spec.ts`).
- **What a good test asserts:** only behavior visible over HTTP. That means status codes, response bodies (presenter shape, including the absence of passwordHash, email and phone where they must not appear), and effects observed through other endpoints (for example, after retiring a Servicio, `GET /me/bookings` shows the Turno `CANCELLED`). Never repository state, call counts or private fields.
- **Isolation:** a fresh app per test, so in-memory state never leaks between tests. Test data is created through the API itself: sign up, create a Negocio, and so on. Shared helpers are allowed for these setup flows.
- **Coverage per endpoint:**
  - the happy path;
  - each validation failure (400);
  - missing, unknown and expired Sesión (401);
  - acting on someone else's Negocio, or a non-Administrador creating an Especialidad (403);
  - not found (404);
  - every conflict and business-rule branch (409 or 422).
- **Booking rules:**
  - one test per rule;
  - a Booking ending exactly at closesAt is accepted;
  - a back-to-back Booking is accepted;
  - an overlap with a Booking at another Business's Branch is rejected;
  - a cancelled Booking doesn't block its slot;
  - a Booking in the past is rejected;
  - after a Service's duration is edited, existing Bookings keep their endsAt.
- **Cascades:**
  - future Bookings are cancelled while in-progress and past ones stay, set up by advancing the Clock after booking;
  - `cancelledBookings` counts are correct;
  - a Professional retired from Business A keeps their Business B Bookings.
- **Sesión:** expires once the Clock moves 30 days forward; a signed-out Sesión is rejected; an unknown email and a wrong password produce identical responses.
- **Prior art:**
  - `test/app.e2e-spec.ts` already uses supertest with `Test.createTestingModule({ imports: [AppModule] })`, but it skips `main.ts`'s pipes, which is why the shared setup function exists.
  - The existing `*.service.spec.ts` files use `Test.createTestingModule` with provider overrides, the same mechanism the Clock override uses.
- All old specs and the hello-world e2e are deleted along with the modules they test.
- Start the first ticket by running `npm test` and `npm run lint`, to know the baseline.

## Out of Scope

- A real database and Prisma adapters, and with them transactions. These come later, with their own ADR.
- Cancelling a Turno by hand (by the Cliente or the Dueño), Reagendar, Ausencia, Confirmación de asistencia, Confirmación de reserva, and any notification, including notifying the Cliente when a cascade cancels their Turno.
- Google: OAuth sign-in, Calendar sync, `googleRefreshToken` and `googleEventId`.
- Rubro.
- Inviting a Profesional who has no account.
- A Profesional's own agenda endpoint.
- Password change or reset, account deletion, Negocio or Sucursal deletion, and reactivating a retired Servicio.
- Per-Sucursal time zones, per-weekday hours, and overnight hours.
- Checking a Cliente's own overlapping Turnos.
- Restricting which Servicios a Profesional can attend. Especialidad stays descriptive.
- Pagination.
- Front changes: switching the front's users repository to an HTTP adapter over this API is a separate ticket in the front repo.

## Further Notes

- Read ADRs 0001 (clean architecture on NestJS-native DI), 0002 (the back owns Usuario) and 0003 (English identifiers) before starting. Front ADR 0001 is marked as partially superseded by ADR 0002.
- Glossary terms (Usuario, Cliente, Dueño, Administrador, Profesional, Especialidad, Turno, Cancelar, Dar de baja) were updated in the front's `CONTEXT.md` during the design session. The code-identifier mapping lives in `docs/agents/domain.md`.
- The Prisma draft agreed in the design session is the target schema. Translate it with the mapping table, and note the deviations recorded above: no `Professional.isActive`, no Google fields, statuses `BOOKED`/`CANCELLED`, and the model named Booking rather than Reserva.
- The front (Next.js) and this API both default to port 3000. When the front starts calling the back, one of them needs a different `PORT`.
- The existing seed Servicios ("Masaje Descontracturante", "Limpieza Facial Profunda") are dropped, since they have no Negocio.
