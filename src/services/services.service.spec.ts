import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ServicesService', () => {
  let service: ServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServicesService],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  it('debería listar los servicios existentes (semilla)', () => {
    const all = service.findAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('debería crear un nuevo servicio correctamente', () => {
    const dto = {
      name: 'Corte de Pelo',
      description: 'Lavado y corte con estilista',
      durationMinutes: 45,
      price: 8500,
    };
    const created = service.create(dto);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(dto.name);
    expect(created.durationMinutes).toBe(45);
  });

  it('debería rechazar un servicio duplicado', () => {
    const dto = {
      name: 'Masaje Descontracturante', // Ya existe en la semilla
      durationMinutes: 30,
      price: 10000,
    };
    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('debería arrojar NotFoundException si no existe el ID', () => {
    expect(() => service.findOne('id-falso')).toThrow(NotFoundException);
  });
});