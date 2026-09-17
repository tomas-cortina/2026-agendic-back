import { Prisma } from '../../generated/prisma/client';

/**
 * Cancels future BOOKED Turnos of a Servicio, optionally narrowed to one Empleado, inside a caller-owned
 * transaction so the cascade and its cancellations commit together. business-model-v2.md's Ports section
 * assigns this capability to the bookings repository, but it must share the caller's transaction to be
 * atomic with the Servicio/Empleado mutation, which a domain port can't be typed against without leaking
 * Prisma into the domain — so it lives here, called directly by the Services/Employees Prisma adapters.
 */
export async function cancelFutureBooked(
  tx: Prisma.TransactionClient,
  where: { serviceId?: number; employeeId?: number },
  now: Date,
) {
  const { count } = await tx.booking.updateMany({
    where: { ...where, status: 'BOOKED', startsAt: { gt: now } },
    data: { status: 'CANCELLED' },
  });
  return count;
}
