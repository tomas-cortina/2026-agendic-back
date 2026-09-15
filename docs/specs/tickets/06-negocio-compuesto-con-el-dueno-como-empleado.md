---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/7
---

# 06: Negocio compuesto con el **Dueño** como Empleado

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

Creating a Negocio sets up everything it needs to take Turnos:

- the Negocio;
- its first Sucursal;
- its first Servicio;
- the Dueño as the Empleado in charge of that Servicio.

From then on, every Servicio not dado de baja has at least one verified Empleado in charge. Anyone browsing a Sucursal sees who attends each Servicio. Profesional and Especialidad disappear, and the Turno takes its v2 shape in the schema, ready for ticket 09.

## Acceptance criteria

- [ ] `POST /businesses` takes three parts, each validated as its own endpoint validates it:
  - the Negocio: name and description;
  - a Sucursal: name, address, `opensAt` and `closesAt`;
  - a Servicio: name, optional description, `durationMinutes` and price.
- [ ] It creates all three, plus an Empleado with the Dueño's name and email, verified and in charge of the Servicio. They are created in one atomic write, so a failure in any part creates nothing.
- [ ] It responds with the created Negocio, Sucursal, Servicio and Empleado, each through its presenter.
- [ ] A Usuario can still create further Negocios the same way.
- [ ] `POST /branches/:id/services` requires `employeeIds`. They must be Empleados of the same Negocio, not dados de baja, and at least one of them verified. Otherwise the request returns 422.
- [ ] `GET /branches/:id/services` shows, for each Servicio, its verified Empleados not dados de baja as `[{ id, name }]`, and never their email.
- [ ] An Empleado's email is unique per Negocio, in any casing, among Empleados not dados de baja. The database index is the backstop, as in ADR 0004.
- [ ] Profesional and Especialidad no longer exist in the schema.
- [ ] The Turno is reshaped to the v2 model:
  - it has the Cliente's name and email instead of a Usuario;
  - it references an Empleado and a Servicio, and no Sucursal;
  - its status is `UNVERIFIED | BOOKED | CANCELLED`;
  - it has verification-token fields;
  - its overlap exclusion is per Empleado, over `BOOKED` Turnos.

  No Turno endpoint exists yet.

- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files and the Prisma adapter's specs.

## Blocked by

- 05: Servicio en Sucursal
