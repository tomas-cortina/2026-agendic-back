import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { ServicesService } from '../services/services.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ReservationsService {
  private reservations: Reservation[] = [];

  constructor(
    private servicesService: ServicesService,
    private professionalsService: ProfessionalsService,
  ) {}

  create(createDto: CreateReservationDto): Reservation {
    // 1. Validar que las entidades existan (arrojarán NotFoundException si no)
    const professional = this.professionalsService.findOne(createDto.professionalId);
    const service = this.servicesService.findOne(createDto.serviceId);

    // 2. Calcular los tiempos exactos
    const requestedStart = new Date(createDto.appointmentDate);
    const requestedEnd = new Date(requestedStart.getTime() + service.durationMinutes * 60000);

    // 3. Validar superposición
    const hasOverlap = this.reservations.some((reservation) => {
      if (reservation.professionalId !== professional.id || reservation.status === 'cancelled') {
        return false;
      }

      const existingStart = new Date(reservation.appointmentDate);
      const existingService = this.servicesService.findOne(reservation.serviceId);
      const existingEnd = new Date(existingStart.getTime() + existingService.durationMinutes * 60000);

      return requestedStart < existingEnd && requestedEnd > existingStart;
    });

    if (hasOverlap) {
      throw new BadRequestException('El profesional ya tiene un turno asignado en ese horario exacto');
    }

    const newReservation = new Reservation({
      id: randomUUID(),
      ...createDto,
      appointmentDate: requestedStart,
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.reservations.push(newReservation);
    return newReservation;
  }

  findAll(): Reservation[] {
    return this.reservations;
  }
}