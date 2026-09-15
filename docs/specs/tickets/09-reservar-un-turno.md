---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/10
---

# 09: Reservar un Turno

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

Anyone can book a Turno without an account. They pick a Servicio, one of its Empleados and a start time, and leave their name and email.

The Turno starts sin verificar and doesn't hold its time slot. The Cliente gets a link, and opening it books the Turno for real, after re-checking every rule. If two Clientes chose the same slot, the first to verify wins. The Dueño sees every Turno in the Negocio.

## Acceptance criteria

- [ ] `POST /bookings` needs no Sesión. It takes `serviceId`, `employeeId`, `startsAt`, `clientName` and `clientEmail`. The email is trimmed and lowercased, and the name is trimmed and non-empty.
- [ ] The request is checked against every booking rule. Any rule failure returns 422, except an overlap, which returns 409:
  - the Servicio exists and isn't dado de baja;
  - the Empleado is in charge of it, verified and not dado de baja;
  - `startsAt` isn't before now, per the Clock;
  - the Turno fits entirely within its Sucursal's hours. Hours are evaluated in `America/Argentina/Buenos_Aires`, with a `ponytail:` comment noting the fixed time zone;
  - it doesn't overlap a `BOOKED` Turno of the same Empleado.
- [ ] `endsAt` is `startsAt` plus the Servicio's duration, fixed when the Turno is booked.
- [ ] A Turno that passes the rules is created as `UNVERIFIED`, and the Mailer sends a link (single-use, expiring after 24 hours, with only the hash stored). The response is `{ id, serviceId, employeeId, startsAt, endsAt, status: "UNVERIFIED" }`.
- [ ] A Turno sin verificar doesn't hold its slot: another Turno for the same Empleado and time can still be created.
- [ ] `POST /bookings/verification` with `{ token }` re-checks every rule at that moment. If they hold, the Turno becomes `BOOKED` and the response is the Turno. On any failure below, the Turno stays `UNVERIFIED`:
  - if an overlapping Turno of the same Empleado was verified first, it returns 409;
  - if a rule no longer holds (the time is now past, the Servicio was dado de baja, the Empleado was taken off or dado de baja), it returns 422;
  - an unknown, used or expired token returns 422.
- [ ] Intervals are half-open. A Turno starting exactly when another ends is accepted, and so is one ending exactly at closing time.
- [ ] Shortening a Sucursal's hours or editing a Servicio's duration leaves `BOOKED` Turnos untouched.
- [ ] `GET /businesses/:id/bookings` lists every Turno of the Negocio, with the Cliente's name and email and the status, for the Dueño only. Anyone else gets 403.
- [ ] `GET /me/bookings` doesn't exist.
- [ ] Every rule and boundary above is covered by co-located `*.http.spec.ts` files using a controlled Clock. That includes two Turnos sin verificar for the same slot, where the first verification wins. The Prisma adapter's specs cover translating the overlap-exclusion violation to 409.

## Blocked by

- 06: Negocio compuesto con el Dueño como Empleado
