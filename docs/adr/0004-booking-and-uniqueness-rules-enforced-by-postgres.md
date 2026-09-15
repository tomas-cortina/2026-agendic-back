# Postgres enforces Turno overlap and case-insensitive name uniqueness

Three rules are enforced by constraints written by hand in the `init` migration, not by application code alone:

- no two `BOOKED` Turnos of the same Empleado overlap, using half-open intervals. This is an exclusion constraint over `tstzrange`, via `btree_gist`;
- Servicio names are unique in any casing among a Sucursal's Servicios that are not dados de baja (`retiredAt` is null);
- an Empleado's email is unique in any casing among a Negocio's Empleados that are not dados de baja (`retiredAt` is null).

An application-only check has a race: two concurrent requests both see a free slot and both write. A database constraint makes the race impossible, and it is cheaper than locking. Prisma can't express these constraints in `schema.prisma`, so they live only in the migration SQL. Prisma's diff ignores them, so it won't try to drop them. The trade-off is that `schema.prisma` is not the whole truth about the database, and the header comment in `schema.prisma` points here.

## Consequences

- The use cases still check the rules themselves. The constraints are the backstop for races.
- Prisma adapters must translate the constraint violations into the same domain errors, which the API returns as 409. Through Prisma 7.10 and `@prisma/adapter-pg` they don't arrive as raw Postgres codes but as `Prisma.PrismaClientKnownRequestError`:
  - a unique-index violation (Postgres `23505`) has code `P2002`, and the violated index's name is in `meta.driverAdapterError.cause.constraint.index`;
  - the Turno overlap exclusion violation (Postgres `23P01`) has the generic code `P2039`, and can only be recognised by `meta.driverAdapterError.cause.originalCode === '23P01'`, or by the constraint name `Booking_no_overlap` in the message.
- A foreign-key violation (Postgres `23503`) arrives the same way, with code `P2003`. It isn't one of these rules, so it is not a 409.
- Storing `startsAt`/`endsAt` as `timestamptz` is required by the exclusion constraint.
