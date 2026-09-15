---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/9
---

# 08: Asignar, sacar y dar de baja Empleados

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

The Dueño decides who attends each Servicio. They can:

- put an Empleado in charge of a Servicio;
- take an Empleado off a Servicio;
- dar de baja an Empleado from the Negocio altogether.

A Servicio not dado de baja is never left without a verified Empleado. Turnos can't be booked yet, so nothing is cancelled here; the cascade arrives in ticket 10.

## Acceptance criteria

- [ ] `POST /services/:id/employees` with `{ employeeId }` puts the Empleado in charge of the Servicio, for the Dueño only.
  - An Empleado already in charge returns 409.
  - An Empleado of another Negocio, or one dado de baja, returns 422.
- [ ] `DELETE /services/:id/employees/:employeeId` takes the Empleado off the Servicio and responds `{ cancelledBookings: 0 }`. If they are the Servicio's last verified Empleado, it returns 422 and nothing changes.
- [ ] `DELETE /employees/:id` gives the Empleado de baja: it sets when they were dados de baja, takes them off every Servicio, and responds `{ cancelledBookings: 0 }`. If they are the last verified Empleado of any Servicio not dado de baja, it returns 422 and nothing changes.
- [ ] Servicios dados de baja don't count for the last-verified-Empleado rule.
- [ ] An Empleado dado de baja disappears from the Dueño's listing and the public listing. Their email can be reused for a new Empleado in the same Negocio.
- [ ] The Dueño's own Empleado follows the same rules, with no special protection.
- [ ] Non-Dueños get 403, and an unknown Servicio or Empleado gets 404.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files and the Prisma adapter's specs.

## Blocked by

- 07: Alta de Empleados con verificación
