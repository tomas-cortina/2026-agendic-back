---
labels: ready-for-agent
---

# 07: Cascadas de cancelación

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

Three actions now cancel the future Turnos that can no longer happen:

- dar de baja a Servicio;
- taking a Profesional off a Sucursal;
- dar de baja a Profesional from a Negocio.

Each response tells the Dueño how many Turnos were cancelled. Turnos that are in progress or already past are never touched. A Profesional's Turnos at other Negocios stay intact. Cancelled Turnos free their time slot.

## Acceptance criteria

- [ ] `DELETE /services/:id` cancels every `BOOKED` Turno of that Servicio whose start is after now, per the Clock, and responds `{ id, cancelledBookings: n }`.
- [ ] `DELETE /branches/:id/professionals/:professionalId` cancels that Profesional's future `BOOKED` Turnos at that Sucursal only, and responds `{ cancelledBookings: n }`.
- [ ] `DELETE /businesses/:id/professionals/:professionalId` cancels that Profesional's future `BOOKED` Turnos at every Sucursal of that Negocio, and responds `{ cancelledBookings: n }`. Their Turnos at other Negocios stay `BOOKED`.
- [ ] Turnos already in progress (started before now, ending after) and past Turnos are never cancelled. Tests book first, then advance the Clock.
- [ ] Cancelled Turnos show `status: "CANCELLED"` in `GET /me/bookings` and `GET /businesses/:id/bookings`.
- [ ] A cancelled Turno no longer blocks its slot. For example, after being taken off one Sucursal, the Profesional can be booked at the same time at another Sucursal where they still work.
- [ ] Each cascade is a single use case, with a `ponytail:` comment noting that it needs a transaction once a database lands.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files.

## Blocked by

- 06: Reservar un Turno
