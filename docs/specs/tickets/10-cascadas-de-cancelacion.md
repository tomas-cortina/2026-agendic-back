---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/11
---

# 10: Cascadas de cancelación

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

Three Dueño actions now cancel the future Turnos that can no longer happen:

- dar de baja a Servicio;
- taking an Empleado off a Servicio;
- dar de baja an Empleado.

Each response tells the Dueño how many Turnos were cancelled. Turnos that are in progress or already past are never touched, and cancelled Turnos free their time slot.

## Acceptance criteria

- [ ] `DELETE /services/:id` cancels every `BOOKED` Turno of that Servicio that starts after now, per the Clock, and responds `{ id, cancelledBookings: n }`.
- [ ] `DELETE /services/:id/employees/:employeeId` cancels that Empleado's future `BOOKED` Turnos for that Servicio only, and responds `{ cancelledBookings: n }`.
- [ ] `DELETE /employees/:id` cancels all of that Empleado's future `BOOKED` Turnos, and responds `{ cancelledBookings: n }`.
- [ ] Turnos already in progress (started before now, ending after) and past Turnos are never cancelled. Tests book first, then advance the Clock.
- [ ] Cascades don't touch Turnos sin verificar. Verifying one afterwards returns 422, because its rules no longer hold.
- [ ] Cancelled Turnos show `status: "CANCELLED"` in the Dueño's listing, and they no longer block their slot.
- [ ] Each cascade is atomic: the action and its cancellations happen together or not at all.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files and the Prisma adapter's specs.

## Blocked by

- 08: Asignar, sacar y dar de baja Empleados
- 09: Reservar un Turno
