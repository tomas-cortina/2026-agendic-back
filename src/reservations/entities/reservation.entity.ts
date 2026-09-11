export class Reservation {
  id!: string;
  customerName!: string;
  customerEmail!: string;
  professionalId!: string;
  serviceId!: string;
  appointmentDate!: Date; // Fecha y hora de inicio
  status!: 'pending' | 'confirmed' | 'cancelled';
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Reservation>) {
    Object.assign(this, partial);
  }
}