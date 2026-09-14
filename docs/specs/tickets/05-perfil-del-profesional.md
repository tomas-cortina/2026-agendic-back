---
labels: ready-for-agent
---

# 05: Perfil del Profesional

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

A Profesional edits their own profile: their phone, and their Especialidades chosen from the platform catalog. The profile is shared by every Negocio they work at, so only the Profesional can edit it, never a Dueño. Their Especialidades show up in the public listing of each Negocio's Profesionales.

## Acceptance criteria

- [ ] `PATCH /professionals/me` (phone optional, specialtyIds) updates the current Usuario's Profesional profile. The given specialtyIds replace the previous set.
- [ ] A Usuario without a Profesional profile gets 404.
- [ ] An unknown specialtyId returns 422.
- [ ] `GET /businesses/:id/professionals` shows each Profesional's Especialidades as `[{ id, name }]`, at every Negocio they work at, and still never shows phone or email.
- [ ] There is no endpoint through which a Dueño edits a Profesional's profile.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files.

## Blocked by

- 03: Especialidad y seed del Administrador
- 04: Profesional en Sucursales
