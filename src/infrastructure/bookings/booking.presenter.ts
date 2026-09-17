import { Booking } from '../../domain/bookings/booking';

export const presentBooking = (booking: Booking) => ({
  id: booking.id,
  serviceId: booking.serviceId,
  employeeId: booking.employeeId,
  startsAt: booking.startsAt,
  endsAt: booking.endsAt,
  status: booking.status,
});

/** Adds what only the Dueño may see. */
export const presentBookingForOwner = (booking: Booking) => ({
  ...presentBooking(booking),
  clientName: booking.clientName,
  clientEmail: booking.clientEmail,
});
