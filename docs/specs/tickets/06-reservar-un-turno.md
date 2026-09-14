---
labels: ready-for-agent
---

# 06: Reservar un Turno

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

A signed-in Cliente books a Turno by choosing a Sucursal, a Profesional, a Servicio and a start time. The API only accepts Turnos the Negocio can actually honour:

- the right Negocio;
- a Profesional who works there;
- not in the past;
- within opening hours, in Argentina time;
- no double-booking of the Profesional anywhere.

The Turno's end is fixed when it's booked. Clientes see their own Turnos, and Dueños see every Turno in their Negocio.

## Acceptance criteria

- [ ] `POST /bookings` (branchId, professionalId, serviceId, startsAt) requires a Sesión. The current Usuario is the Cliente.
- [ ] It responds `{ id, branchId, professionalId, serviceId, startsAt, endsAt, status: "BOOKED" }`, with ISO date strings.
- [ ] `endsAt` equals `startsAt` plus the Servicio's duration, fixed at booking. Editing the Servicio's duration afterwards doesn't change it.
- [ ] A Servicio from another Negocio, or one dado de baja, returns 422.
- [ ] A Profesional who doesn't work at that Sucursal returns 422.
- [ ] A `startsAt` before now, per the Clock, returns 422.
- [ ] A Turno that doesn't fit entirely within the Sucursal's hours returns 422. Hours are evaluated in `America/Argentina/Buenos_Aires` for every Sucursal, with a `ponytail:` comment noting the fixed time zone.
- [ ] A Turno ending exactly at closing time is accepted.
- [ ] A Turno overlapping another `BOOKED` Turno of the same Profesional, at any Sucursal of any Negocio, returns 409.
- [ ] Intervals are half-open, so a Turno starting exactly when another ends is accepted.
- [ ] Overlap between Turnos of the same Cliente is not checked.
- [ ] Shortening a Sucursal's hours leaves already-booked Turnos in place, while new Turnos outside the new hours are rejected.
- [ ] `GET /me/bookings` lists the current Usuario's Turnos as a Cliente.
- [ ] `GET /businesses/:id/bookings` lists every Turno in the Negocio, for its Dueño only. Anyone else gets 403.
- [ ] Every rule and boundary above is covered by co-located `*.http.spec.ts` files, using a controlled Clock.

## Blocked by

- 02: Negocio, Sucursal y Servicio
- 04: Profesional en Sucursales
