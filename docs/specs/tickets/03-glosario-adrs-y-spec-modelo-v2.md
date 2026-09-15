---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/4
---

# 03: Glosario, ADRs y spec del modelo v2

## Parent

Supersedes build steps 5–8 of `docs/specs/clean-architecture-rebuild.md`.

## What to build

The business model changed, and the shared vocabulary and recorded decisions catch up with it, so every implementation ticket that follows speaks one language.

In the new model:

- A Cliente is not a Usuario. They book with a name and an email, and verify the email.
- The Profesional becomes an Empleado: a name and an email within one Negocio, with no account.
- Especialidad disappears.
- A Servicio belongs to a Sucursal and is attended by Empleados.
- Creating a Negocio starts with one Sucursal, one Servicio, and the Dueño as its Empleado.
- Every email is verified: a Usuario's, an Empleado's and a Cliente's.

## Acceptance criteria

- [ ] The glossary drops **Profesional** and **Especialidad**.
- [ ] It adds **Empleado**: a person who attends a Negocio's Servicios, identified by name and email within that Negocio, and not necessarily a Usuario. "Empleado" is no longer listed under _Avoid_.
- [ ] **Staff** now means the set of a Negocio's Empleados.
- [ ] **Cliente** is redefined as a person who books Turnos by leaving a name and an email. A Cliente doesn't need to be a Usuario.
- [ ] **Usuario** is redefined: a Usuario verifies their email before getting a Sesión and can be Dueño of zero or more Negocios. The definition no longer says "Profesional y/o Cliente".
- [ ] **Administrador** is redefined as a Usuario with developer access, with no mention of Especialidades.
- [ ] **Servicio**, **Turno** and **Dar de baja** are updated:
  - a Servicio is offered by a Sucursal and attended by one or more Empleados;
  - a Turno is a Cliente's booking with an Empleado for a Servicio;
  - dar de baja applies to a Servicio or an Empleado.
- [ ] The glossary adds **Verificar email**: opening the link sent by email to prove the address is real.
- [ ] The glossary adds **Turno sin verificar**: a Turno whose Cliente hasn't verified their email yet. It doesn't hold its time slot. "Pendiente" stays reserved for Aceptar turno and Rechazar turno.
- [ ] The code-identifier table gains these rows:

  | Glosario | Code |
  | --- | --- |
  | Empleado | `Employee` |
  | Cliente | `Booking.clientName` / `Booking.clientEmail` |
  | Turno sin verificar | `BookingStatus.UNVERIFIED` |
  | Verificar email | `verifyEmail` / `emailVerifiedAt` |

- [ ] The table's existing rows are updated: Dar de baja also maps to `Employee.retiredAt`, and the Turno statuses become `UNVERIFIED | BOOKED | CANCELLED`. The Profesional and Especialidad rows are removed.
- [ ] ADR 0004 is updated:
  - the overlap exclusion is per Empleado;
  - the Especialidad rule is gone;
  - a Servicio's name is unique per Sucursal;
  - an Empleado's email is unique per Negocio, in any casing, among Empleados not dados de baja.
- [ ] A new ADR records that the Cliente has no account. Their name and verified email live on the Turno. A Turno sin verificar doesn't hold its slot, so nobody can block an agenda with fake emails, and verifying re-checks every booking rule. The first Turno to be verified wins the slot.
- [ ] A new spec for the v2 model holds the decisions, the HTTP contract and the rules. The rebuild spec notes that this new spec supersedes its build steps 5–8.

## Blocked by

- None (can start immediately).
