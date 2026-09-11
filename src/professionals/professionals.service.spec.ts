import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalsService } from './professionals.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfessionalsService],
    }).compile();

    service = module.get<ProfessionalsService>(ProfessionalsService);
  });

  it('debería crear un profesional exitosamente', () => {
    const dto = { name: 'Juan Perez', email: 'juan@spa.com', specialty: 'Masajista' };
    const result = service.create(dto);
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Juan Perez');
  });

  it('debería rechazar un email duplicado', () => {
    const dto = { name: 'Juan', email: 'juan@spa.com', specialty: 'Masajista' };
    service.create(dto);
    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('debería hacer un borrado lógico (soft delete)', () => {
    const dto = { name: 'Ana', email: 'ana@spa.com', specialty: 'Cosmetóloga' };
    const created = service.create(dto);
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow(NotFoundException);
    expect(service.findAll().length).toBe(0);
  });
});