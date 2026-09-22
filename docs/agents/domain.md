# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`../2026-agendic-front/CONTEXT.md`**: the Agendic glossary is shared by front and back and lives in the front repo (clone both repos as siblings). Back-only terms are added there too; this repo has no `CONTEXT.md` of its own.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Code identifiers

The glossary is in Spanish; code is in English (ADR 0003). Each term has exactly one identifier. Add a row when a new glossary term reaches the code.

| Glosario | Code |
| --- | --- |
| Negocio | `Business` |
| Dueño | `owner` (`Business.ownerId`) |
| Sucursal | `Branch` (apertura/cierre → `opensAt`/`closesAt`) |
| Usuario | `User` |
| Cliente | `Booking.clientName` / `Booking.clientEmail` |
| Empleado | `Employee` |
| Servicio | `Service` |
| Categoría de Servicio | `ServiceCategory` (`Service.category`) |
| Turno | `Booking` (inicio/fin → `startsAt`/`endsAt`; estado → `BookingStatus.UNVERIFIED \| BOOKED \| CANCELLED`) |
| Turno sin verificar | `BookingStatus.UNVERIFIED` |
| Reservar | `book` |
| Cancelar | `cancel` |
| Dar de baja | `retire` (`Service.retiredAt`, `Employee.retiredAt`) |
| Sesión / Iniciar sesión / Cerrar sesión | `Session` / `signIn` / `signOut` |

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
