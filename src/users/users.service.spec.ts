import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('debería crear un usuario exitosamente', () => {
    const dto = { name: 'Admin', email: 'admin@spa.com', password: 'password123', role: 'admin' as const };
    const result = service.create(dto);
    expect(result.id).toBeDefined();
    expect(result.email).toBe('admin@spa.com');
  });

  it('debería rechazar un email duplicado', () => {
    const dto = { name: 'User', email: 'test@spa.com', password: 'password123', role: 'customer' as const };
    service.create(dto);
    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('debería hacer un borrado lógico (soft delete)', () => {
    const dto = { name: 'User2', email: 'test2@spa.com', password: 'password123', role: 'customer' as const };
    const created = service.create(dto);
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow(NotFoundException);
    expect(service.findAll().length).toBe(0);
  });
});