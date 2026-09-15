---
labels: ready-for-agent
issue: https://github.com/tomas-cortina/2026-agendic-back/issues/5
---

# 04: Verificación de email del Usuario

## Parent

Spec: Business model v2 (`docs/specs/business-model-v2.md`, written in ticket 03).

## What to build

A Usuario proves their email is real before getting a Sesión. Signing up no longer signs the Usuario in. Instead, it sends a link by email, and opening that link verifies the email and signs them in.

Changing email works the same way: the new email only takes effect once it's verified, so a typo never locks anyone out.

Emails go out through a Mailer port. For now, its only adapter logs the link.

## Acceptance criteria

- [ ] `POST /users` creates the Usuario with the email unverified and sends a verification link through the Mailer. It responds 201 with the Usuario's `{ id, name, email, role }` and no Sesión.
- [ ] The link carries a single-use token that expires 24 hours after it's issued. Only the token's SHA-256 is stored, as with Sesiones.
- [ ] `POST /users/verification` with `{ token }` verifies the email and responds `{ sessionId, expiresAt }`. An unknown, already used or expired token returns 422.
- [ ] `POST /sessions` returns 403 for an unverified Usuario with the right password. The response is distinguishable from the generic 401, so the front can offer to resend the link. A wrong password still gets the generic 401, whether or not the email is verified.
- [ ] `POST /users/verification/resend` with `{ email }` sends a fresh link to an unverified Usuario and invalidates the previous one. It always responds 204.
- [ ] `PATCH /users/me` with a new email stores it as pending and sends a link to the new address. The current email keeps working for signing in.
  - Verifying that link replaces the email.
  - A new email that's already registered returns 409 at `PATCH` time.
  - If another Usuario registers the email in the meantime, verifying returns 409.
- [ ] `GET /users/me` also shows the pending email, if there is one.
- [ ] The Mailer adapter only logs the link, with a `ponytail:` comment noting that a real provider is still pending. No dependency is added.
- [ ] Every behaviour above is covered by co-located `*.http.spec.ts` files with the Mailer mocked. The Prisma adapter's specs prove that only the token's hash is stored.

## Blocked by

- 03: Glosario, ADRs y spec del modelo v2
