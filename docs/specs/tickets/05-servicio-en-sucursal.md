---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/6
---

# 05: Servicio en Sucursal

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

Servicios belong to a Sucursal instead of to the whole Negocio, so each Sucursal offers its own set. The Dueño manages Servicios per Sucursal, and anyone can browse a Sucursal's Servicios. Empleados arrive in ticket 06.

## Acceptance criteria

- [ ] `POST /branches/:id/services` creates a Servicio in that Sucursal, for the Dueño of its Negocio only. It takes a name, an optional description, `durationMinutes` (a whole number of at least 1) and a price (a number not below 0). Other Usuarios get 403, and an unknown Sucursal gets 404.
- [ ] A name already used by a Servicio not dado de baja in the same Sucursal, in any casing, returns 409. Another Sucursal can reuse it, even within the same Negocio.
- [ ] `PATCH /services/:id` and `DELETE /services/:id` behave as before, with the uniqueness rule checked per Sucursal.
- [ ] `GET /branches/:id/services` works without a Sesión and lists that Sucursal's Servicios not dados de baja.
- [ ] `POST /businesses/:id/services` and `GET /businesses/:id/services` no longer exist.
- [ ] A Servicio's response carries `branchId` instead of `businessId`.
- [ ] The database's case-insensitive unique index covers the Sucursal and the name, among Servicios not dados de baja. Its violation still maps to 409, as in ADR 0004.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files and the Prisma adapter's specs.

## Blocked by

- 03: Glosario, ADRs y spec del modelo v2
