---
labels: ready-for-agent
---

# Business model v2

## Parent

Supersedes build steps 5–8 of `docs/specs/clean-architecture-rebuild.md` (Especialidad, Servicio, Profesional, Turno). Steps 1–4 (Usuario, Sesión, Negocio, Sucursal) stand as built.

## What changed

- A Cliente is not a Usuario: they book with a name and an email, and verify it. See ADR 0005.
- Profesional and Especialidad are gone. A Servicio is attended by Empleados: a name and an email within one Negocio, with no account of their own.
- A Servicio belongs to a Sucursal, not directly to a Negocio.
- Creating a Negocio now creates one Sucursal, one Servicio and the Dueño as its verified Empleado, in one atomic write.
- Every email is verified: a Usuario's, an Empleado's and a Cliente's, all through the same shape (a single-use token, expiring 24 hours after issue, only its SHA-256 stored, sent by a `Mailer` port whose only adapter logs the link).

Glossary: `../2026-agendic-front/CONTEXT.md`. Code identifiers: `docs/agents/domain.md`. See ADR 0004 (constraints enforced by Postgres) and ADR 0005 (Cliente has no account).

## Domain model

- **User**: id, name, email (unique across the platform, trimmed and lowercased), pendingEmail (optional, takes effect once verified), passwordHash, role (`ADMIN` or `USER`), emailVerifiedAt (nullable), createdAt.
- **Session**: unchanged — id, userId, expiresAt.
- **Business**: unchanged — id, name, description, ownerId.
- **Branch**: unchanged — id, businessId, name, address, opensAt, closesAt.
- **Service**: id, **branchId** (was businessId), name, description (optional), durationMinutes, price, retiredAt (nullable); Employees in charge (many-to-many).
- **Employee** (new, replaces Professional and Specialty): id, businessId, name, email, emailVerifiedAt (nullable — set immediately if the email belongs to an already-verified Usuario, otherwise once its own link is opened), retiredAt (nullable); Services in charge of (many-to-many).
- **Booking**: id, serviceId, employeeId, clientName, clientEmail, startsAt, endsAt (fixed at booking), status (`UNVERIFIED | BOOKED | CANCELLED`), verification token fields (hash, expiresAt), createdAt. No `branchId` (reached through `serviceId`), no `clientId`, no `professionalId`.
- Removed entirely: **Professional**, **Specialty**.

## Ports

- Repositories, all async: users, sessions, businesses, branches, services, employees, bookings.
- `Mailer`: sends a verification link. The only adapter logs it (`ponytail:` — a real provider is still pending).
- The bookings repository exposes: `BOOKED` bookings of an Employee overlapping an interval; bookings by Business; cancel `BOOKED` bookings starting after a given instant, filtered by Service, or by Employee (optionally narrowed to one Service). Cancellation returns the count.

## Use cases

- **Usuario**: sign-up (unverified, no Sesión), verify email, resend verification, sign-in (403 if unverified, generic 401 for a wrong password either way), sign-out, validate session, get me, update me (email change goes through `pendingEmail`).
- **Negocio**: create (Negocio + first Sucursal + first Servicio + Dueño-as-Empleado, atomic), update, list, get.
- **Sucursal**: create, update, list by Negocio.
- **Servicio**: create in a Sucursal (with `employeeIds`, at least one verified), update, retire (cascade), list active by Sucursal.
- **Empleado**: add by name and email (verified at once if the email is an already-verified Usuario's, otherwise pending), verify, resend verification, update name, list by Negocio, assign to a Servicio, remove from a Servicio (cascade), retire from the Negocio (cascade).
- **Turno**: book (public, creates `UNVERIFIED`, sends a link), verify (re-checks every rule, `BOOKED` on success), list by Negocio (Dueño only). No "list mine": a Cliente has no account to list them under.

## Booking rules (checked both at booking and at verification)

1. The Servicio exists and isn't dado de baja.
2. The Empleado is in charge of that Servicio, verified and not dado de baja.
3. `startsAt` isn't before now (per Clock).
4. The Turno fits entirely within its Sucursal's hours (`America/Argentina/Buenos_Aires`; `ponytail:` fixed time zone, revisit with per-Sucursal time zones).
5. `endsAt = startsAt + Service.durationMinutes`, fixed once, at booking time.
6. No overlap with a `BOOKED` Turno of the same Empleado. Intervals are half-open. Only `BOOKED` Turnos hold their slot — `UNVERIFIED` ones don't (ADR 0005), so the first to verify a contested slot wins and the other gets 409.

## Cascades

"Future" means `startsAt > now` per Clock; in-progress and past Turnos are never touched. `UNVERIFIED` Turnos are never cancelled by a cascade — verifying one afterwards simply fails a rule and returns 422.

- **Retire Servicio**: cancel its future `BOOKED` Turnos. `{ id, cancelledBookings }`.
- **Remove Empleado from a Servicio**: cancel that pair's future `BOOKED` Turnos; refused with 422 if it's the Servicio's last verified Empleado.
- **Retire Empleado from the Negocio**: unlink from every Servicio and cancel all their future `BOOKED` Turnos; refused with 422 if they're the last verified Empleado of any Servicio not dado de baja.

## Uniqueness

- Usuario email: unique across the platform, trimmed and lowercased.
- Servicio name: unique per Sucursal among Servicios not dados de baja, regardless of casing.
- Empleado email: unique per Negocio among Empleados not dados de baja, regardless of casing.

## HTTP contract

- **Usuario / Sesión**: `POST /users` (sign-up, no Sesión in the response), `POST /users/verification`, `POST /users/verification/resend`, `POST /sessions`, `DELETE /sessions/current`, `GET /users/me`, `PATCH /users/me`.
- **Negocio**: `POST /businesses`, `PATCH /businesses/:id`, `GET /businesses`, `GET /businesses/:id` (last two public).
- **Sucursal**: `POST /businesses/:id/branches`, `PATCH /branches/:id`, `GET /businesses/:id/branches` (public).
- **Servicio**: `POST /branches/:id/services`, `PATCH /services/:id`, `DELETE /services/:id` (retire), `GET /branches/:id/services` (public, active only, with verified Empleados not dados de baja as `[{ id, name }]`).
- **Empleado**: `POST /businesses/:id/employees`, `POST /employees/verification`, `POST /employees/:id/verification/resend`, `PATCH /employees/:id`, `DELETE /employees/:id` (retire, cascade), `GET /businesses/:id/employees` (Dueño only), `POST /services/:id/employees`, `DELETE /services/:id/employees/:employeeId` (cascade).
- **Turno**: `POST /bookings` (public), `POST /bookings/verification` (public), `GET /businesses/:id/bookings` (Dueño only). No `GET /me/bookings`.

## Presenters

- **Usuario**: `{ id, name, email, pendingEmail?, role }`. Never passwordHash.
- **Empleado (Dueño's view)**: `{ id, name, email, verified }`. **Empleado (public, on a Servicio)**: `{ id, name }` only — never email.
- **Servicio**: `{ id, branchId, name, description, durationMinutes, price, employees: [{ id, name }] }`.
- **Turno**: `{ id, serviceId, employeeId, clientName, clientEmail, startsAt, endsAt, status }` — `clientName`/`clientEmail` only in the Dueño's listing.
- **Negocio**, **Sucursal** unchanged.

## Domain errors → HTTP status

| Status | Errors |
| --- | --- |
| 400 | Input validation |
| 401 | Unauthenticated, or sign-in with an unknown email or wrong password |
| 403 | Sign-in with a correct password but unverified email; not the Dueño |
| 404 | Not found |
| 409 | Email already registered/pending elsewhere, duplicate Servicio or Empleado email, overlapping Turno |
| 422 | Business-rule violation: outside hours, in the past, Empleado not in charge/unverified/dado de baja, Servicio dado de baja, expired/used/unknown verification token, removing or retiring an Empleado who is the last verified Empleado of a Servicio not dado de baja |

## Out of scope (carried over from the rebuild spec, still true)

Reagendar, Ausencia, Confirmación de asistencia, Confirmación de reserva, and any notification beyond the verification links above; Google OAuth/Calendar; Rubro; password change or reset, account deletion, Negocio/Sucursal deletion, reactivating a retired Servicio or a dado-de-baja Empleado; per-Sucursal time zones, per-weekday hours, overnight hours; checking a Cliente's own overlapping Turnos across bookings; pagination; a real database transaction mechanism beyond what Postgres constraints already backstop (still `ponytail:`-marked per rebuild spec ADR 0001 note, until it lands).
