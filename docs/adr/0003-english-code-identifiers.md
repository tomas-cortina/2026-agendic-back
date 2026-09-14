# English code identifiers over a Spanish glossary

The glossary (front `CONTEXT.md`) and the first Prisma draft of the model are in Spanish, but every code identifier (entities, fields, enums, use cases, endpoints) is in English, consistent with the front's code (`User` for Usuario) and the NestJS ecosystem. The cost is a translation layer: each glossary term has exactly one English identifier, listed in `docs/agents/domain.md`, and no synonyms are introduced (a Turno is always `Booking`, never `Appointment` or `Reservation`).
