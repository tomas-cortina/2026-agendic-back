---
labels: ready-for-agent
---

# 02: Negocio, Sucursal y Servicio

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

Any Usuario can create a Negocio and becomes its Dueño. The Dueño sets up the Negocio's Sucursales, with opening hours, and its Servicios, and can dar de baja a Servicio. Everyone, signed in or not, can browse Negocios, their Sucursales and their active Servicios. Only the Dueño can change anything in a Negocio.

## Acceptance criteria

- [ ] `POST /businesses` (name, description) creates a Negocio whose Dueño is the current Usuario. A Usuario can be Dueño of several Negocios.
- [ ] `PATCH /businesses/:id` edits name and description, for the Dueño only. Any other Usuario gets 403, and an unknown Negocio gets 404.
- [ ] `GET /businesses` and `GET /businesses/:id` work without a Sesión.
- [ ] `POST /businesses/:id/branches` (name, address, opensAt, closesAt) creates a Sucursal, for the Dueño only.
- [ ] Malformed times (not `HH:mm`) return 400. A closing time that isn't after the opening time, so it would cross midnight, returns 422.
- [ ] `PATCH /branches/:id` edits a Sucursal's name, address and hours, for the Dueño of its Negocio only, with the same validation as creation.
- [ ] `GET /businesses/:id/branches` works without a Sesión.
- [ ] `POST /businesses/:id/services` validates its input: name; optional description; durationMinutes, a whole number of at least 1; price, a number not below 0. Dueño only.
- [ ] A Servicio name already used by an active Servicio of the same Negocio, in any casing, returns 409. Another Negocio can use the same name.
- [ ] `PATCH /services/:id` edits a Servicio, for the Dueño only, with the same uniqueness rule applied on rename.
- [ ] `DELETE /services/:id` gives the Servicio de baja, for the Dueño only, and responds `{ id, cancelledBookings: 0 }`. Turnos don't exist yet, and the cascade arrives in ticket 07.
- [ ] A Servicio dado de baja no longer appears in `GET /businesses/:id/services`, and its name can be reused.
- [ ] `GET /businesses/:id/services` works without a Sesión and lists active Servicios only.
- [ ] Responses for Negocio, Sucursal and Servicio go through presenters that list their fields explicitly.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files: happy paths, 400, 401, 403, 404, 409 and 422 cases.

## Blocked by

- 01: Usuario y Sesión on the new architecture
