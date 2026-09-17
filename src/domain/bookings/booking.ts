export enum BookingStatus {
  UNVERIFIED = 'UNVERIFIED',
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
}

export interface Booking {
  id: number;
  serviceId: number;
  employeeId: number;
  clientName: string;
  clientEmail: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
}

export interface CreateBookingInput {
  serviceId: number;
  employeeId: number;
  startsAt: Date;
  clientName: string;
  clientEmail: string;
}

const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export const bookingVerificationExpiresAt = (issuedAt: Date) =>
  new Date(issuedAt.getTime() + VERIFICATION_TOKEN_LIFETIME_MS);
