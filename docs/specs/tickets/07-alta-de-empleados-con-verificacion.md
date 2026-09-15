---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/8
---

# 07: Alta de Empleados con verificación

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

The Dueño adds Empleados to the Negocio by name and email. An email that belongs to a verified Usuario is trusted at once. Any other email gets a verification link, and the Empleado stays pending until it's opened. A pending Empleado can't be booked and doesn't count as a verified Empleado in charge of a Servicio.

The Dueño sees the Staff with each Empleado's email and status, can resend a link, and can fix a name.

## Acceptance criteria

- [ ] `POST /businesses/:id/employees` with a name and an email adds an Empleado, for the Dueño only. The email is trimmed and lowercased, and the name is trimmed and non-empty.
- [ ] If the email belongs to a Usuario whose email is verified, the Empleado is verified at once and no mail is sent. Otherwise, the Empleado is pending and the Mailer sends a link. The link carries a single-use token that expires after 24 hours, and only its hash is stored.
- [ ] An email already used by an Empleado not dado de baja in the same Negocio, in any casing, returns 409. Another Negocio can use it.
- [ ] `POST /employees/verification` with `{ token }` verifies the Empleado and responds 204. An unknown, used or expired token returns 422.
- [ ] `POST /employees/:id/verification/resend` sends a fresh link and invalidates the previous one, for the Dueño only. An already verified Empleado returns 422.
- [ ] `PATCH /employees/:id` edits only the name, for the Dueño only. The email can't be changed.
- [ ] `GET /businesses/:id/employees` lists the Empleados not dados de baja as `{ id, name, email, verified }`, for the Dueño only.
- [ ] A pending Empleado can be among the `employeeIds` when creating a Servicio, but doesn't satisfy the at-least-one-verified rule. They show up in the public listing of Servicios only once verified.
- [ ] Non-Dueños get 403, and an unknown Negocio or Empleado gets 404.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files with the Mailer mocked, and by the Prisma adapter's specs.

## Blocked by

- 04: Verificación de email del Usuario
- 06: Negocio compuesto con el Dueño como Empleado
