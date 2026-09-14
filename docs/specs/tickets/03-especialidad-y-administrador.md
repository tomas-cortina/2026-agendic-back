---
labels: ready-for-agent
---

# 03: Especialidad y seed del Administrador

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

The platform gets its first Administrador at startup, from environment variables. That Administrador curates a single platform-wide catalog of Especialidades, and anyone can list the catalog. No other Usuario can add to it.

## Acceptance criteria

- [ ] When `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, a Usuario with role `ADMIN` exists at startup and can sign in with those credentials. When they aren't set, no Administrador is seeded and the app still starts.
- [ ] `POST /specialties` (name) creates an Especialidad, for Administradores only. Other Usuarios get 403, and requests without a Sesión get 401.
- [ ] A duplicate Especialidad name, in any casing, returns 409.
- [ ] `GET /specialties` works without a Sesión and returns `[{ id, name }]`.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files.

## Blocked by

- 01: Usuario y Sesión on the new architecture
