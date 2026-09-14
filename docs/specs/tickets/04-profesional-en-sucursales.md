---
labels: ready-for-agent
---

# 04: Profesional en Sucursales

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

A Dueño adds existing Usuarios as Profesionales to their Sucursales, by email. The same Usuario can work as a Profesional at several Negocios with one shared profile.

The Dueño can take a Profesional off one Sucursal, or dar de baja them from the whole Negocio. Either way, their account and their work at other Negocios stay intact. Anyone can list a Negocio's Profesionales without seeing private data.

## Acceptance criteria

- [ ] `POST /branches/:id/professionals` with `{ email }`, for the Dueño of that Sucursal's Negocio only, links the Usuario with that email to the Sucursal as a Profesional.
- [ ] An email with no account returns 422.
- [ ] The Usuario's Profesional profile is created the first time they are added anywhere. If they are already a Profesional at another Negocio, the same profile is reused.
- [ ] Adding a Profesional already linked to that Sucursal returns 409.
- [ ] `DELETE /branches/:id/professionals/:professionalId`, for the Dueño only, unlinks the Profesional from that one Sucursal and responds `{ cancelledBookings: 0 }`. Turnos don't exist yet, and the cascade arrives in ticket 07.
- [ ] `DELETE /businesses/:id/professionals/:professionalId`, for the Dueño only, unlinks the Profesional from every Sucursal of that Negocio and responds `{ cancelledBookings: 0 }`.
- [ ] The Profesional's links to other Negocios' Sucursales are untouched, and their Usuario account still works.
- [ ] A Profesional has no active flag. Being dado de baja is only the absence of links.
- [ ] `GET /businesses/:id/professionals` works without a Sesión. It returns `{ id, name, specialties, branchIds }` for each Profesional linked to at least one of that Negocio's Sucursales, with `branchIds` limited to that Negocio. It never includes email or phone.
- [ ] Non-Dueños get 403; unknown Sucursal, Negocio or Profesional get 404.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files, including a Profesional shared by two Negocios.

## Blocked by

- 02: Negocio, Sucursal y Servicio
