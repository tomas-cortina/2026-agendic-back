---
labels: ready-for-agent
---

# 01: Usuario y Sesión on the new architecture

## Parent

Spec: Rebuild the API on clean architecture around Negocio, Sucursal, Profesional and Turno (`docs/specs/clean-architecture-rebuild.md`)

## What to build

A visitor can sign up and immediately gets a Sesión. A Usuario can sign in, sign out, and see and edit their own profile. Everything that needs a Sesión rejects missing, unknown, expired or signed-out ones. No response ever exposes a password.

This is the tracer bullet for the new architecture (ADR 0001, ADR 0003), so it also lays the shared foundation every later ticket builds on:

- the domain, application and infrastructure layers with feature subfolders;
- domain errors translated to HTTP by one exception filter;
- one app-setup function shared by the entry point and the tests;
- the Clock port;
- the oxlint dependency rule;
- the first HTTP-seam specs.

The old `services`, `professionals`, `reservations` and `users` modules, their specs, and the hello-world controller and e2e test are deleted.

## Acceptance criteria

- [ ] `npm test` and `npm run lint` were run before any change, to record the baseline.
- [ ] The old feature modules, their specs, the hello-world controller and service, and the hello-world e2e test are gone.
- [ ] Code is organised as domain / application / infrastructure with feature subfolders, and identifiers follow the mapping table in `docs/agents/domain.md`.
- [ ] Lint fails if the domain imports from application, infrastructure or any `@nestjs/*` package, or if application imports from infrastructure. Application may import only `Injectable` and `Inject` from `@nestjs/common`.
- [ ] One exception filter maps domain errors to 401, 403, 404, 409 and 422, as in the spec's table. Input validation errors are 400.
- [ ] The entry point and the tests configure the app through the same setup function: validation pipe with whitelist, forbid-non-whitelisted and transform; the exception filter; CORS.
- [ ] A Clock port provides "now". Its adapter returns system time, and the tests override it.
- [ ] Repository ports are async and generate integer ids and timestamps themselves. Adapters are in-memory.
- [ ] `POST /users` validates its input: name trimmed and non-empty; email valid, trimmed and lowercased; password 12–72 characters. The password is stored hashed through a password-hasher port whose adapter uses scrypt from `node:crypto`.
- [ ] `POST /users` responds with `{ sessionId, expiresAt }`. The Sesión expires 30 days after issue.
- [ ] Signing up with an already registered email, in any casing, returns 409.
- [ ] `POST /sessions` with correct credentials returns `{ sessionId, expiresAt }`. An unknown email and a wrong password produce identical 401 responses.
- [ ] Endpoints that need a Sesión read `Authorization: Bearer <sessionId>`. They return 401 when the header is missing, when the Sesión is unknown, when the Clock has moved 30 days past issue, or when the Sesión was signed out.
- [ ] `DELETE /sessions/current` signs out the current Sesión.
- [ ] `GET /users/me` returns `{ id, name, email, role }`.
- [ ] `PATCH /users/me` changes name and/or email with the same validation and uniqueness rules as sign-up (409 on a taken email).
- [ ] No response anywhere contains `password` or `passwordHash`. `GET /users` and `GET /users/:id` don't exist.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files using supertest against the full app, configured by the shared setup function, with a fresh app per test.

## Blocked by

None (can start immediately).
