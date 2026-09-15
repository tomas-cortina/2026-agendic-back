# Cliente has no account; a Turno holds its name and email, unverified until it's verified

A Cliente is not a Usuario: they book a Turno with a name and an email, no sign-up. Those live on the Turno itself (`Booking.clientName`, `Booking.clientEmail`), not on a separate account.

A newly booked Turno is `UNVERIFIED` and doesn't hold its time slot: the overlap exclusion (ADR 0004) only applies among `BOOKED` Turnos. Without this, anyone could block a Sucursal's agenda by typing a fake email for every open slot. Verifying the Turno re-checks every booking rule at that moment, because time has passed since it was requested: the slot may have been taken, the Empleado may have been dado de baja, or the Servicio retired. If two Clientes requested the same slot, the first one to verify wins; the other's verification then fails the overlap check and returns 409.

## Consequences

- No Cliente-facing sign-in, password or profile: `clientName`/`clientEmail` are plain columns on `Booking`, not a foreign key.
- A Turno needs verification-token fields (hash, expiry), the same shape as a Usuario's or an Empleado's.
- Two Turnos for the same Empleado and time can both exist as `UNVERIFIED`; only one can become `BOOKED`.
