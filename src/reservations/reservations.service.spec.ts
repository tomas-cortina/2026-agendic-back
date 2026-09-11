import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { ServicesService } from '../services/services.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { BadRequestException } from '@nestjs/common';

describe('ReservationsService', () => {
  let service: ReservationsService;

  // Simulamos las respuestas de los otros módulos
  const mockServicesService = {
    findOne: jest.fn().mockImplementation((id) => ({
      id,
      durationMinutes: 60, // Simulamos un servicio de 1 hora
    })),
  };

  const mockProfessionalsService = {
    findOne: jest.fn().mockImplementation((id) => ({ id })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: ServicesService, useValue: mockServicesService },
        { provide: ProfessionalsService, useValue: mockProfessionalsService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('debería crear una reserva si el horario está libre', () => {
    const dto = {
      customerName: 'Ana',
      customerEmail: 'ana@test.com',
      professionalId: 'prof-1',
      serviceId: 'serv-1',
      appointmentDate: '2026-10-15T10:00:00Z',
    };
    const result = service.create(dto);
    expect(result.id).toBeDefined();
    expect(result.status).toBe('confirmed');
  });

  it('debería rechazar la reserva si choca con otro turno del mismo profesional', () => {
    const dto1 = {
      customerName: 'Ana',
      customerEmail: 'ana@test.com',
      professionalId: 'prof-1',
      serviceId: 'serv-1',
      appointmentDate: '2026-10-15T10:00:00Z', // Turno: 10:00 a 11:00
    };
    service.create(dto1);

    const dto2 = {
      customerName: 'Carlos',
      customerEmail: 'carlos@test.com',
      professionalId: 'prof-1', // Mismo profesional
      serviceId: 'serv-1',
      appointmentDate: '2026-10-15T10:30:00Z', // Intenta a las 10:30 (superposición)
    };

    expect(() => service.create(dto2)).toThrow(BadRequestException);
  });
});