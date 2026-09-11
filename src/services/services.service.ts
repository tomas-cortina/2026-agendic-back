import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ServicesService {
  // Almacén en memoria (Mock DB)
  private services: Service[] = [
    // Datos semilla para probar inmediatamente
    new Service({
      id: randomUUID(),
      name: 'Masaje Descontracturante',
      description: 'Sesión de masajes de espalda y cuello con aromaterapia',
      durationMinutes: 50,
      price: 15000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    new Service({
      id: randomUUID(),
      name: 'Limpieza Facial Profunda',
      description: 'Exfoliación, hidratación y máscara de colágeno',
      durationMinutes: 60,
      price: 18000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  // Crear servicio
  create(createServiceDto: CreateServiceDto): Service {
    const existing = this.services.find(
      (s) => s.name.toLowerCase() === createServiceDto.name.toLowerCase() && s.isActive,
    );
    if (existing) {
      throw new BadRequestException(`Ya existe un servicio activo con el nombre "${createServiceDto.name}"`);
    }

    const newService = new Service({
      id: randomUUID(),
      name: createServiceDto.name,
      description: createServiceDto.description,
      durationMinutes: createServiceDto.durationMinutes,
      price: createServiceDto.price,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.services.push(newService);
    return newService;
  }

  // Obtener todos los servicios activos
  findAll(): Service[] {
    return this.services.filter((s) => s.isActive);
  }

  // Obtener un servicio por ID
  findOne(id: string): Service {
    const service = this.services.find((s) => s.id === id);
    if (!service || !service.isActive) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return service;
  }

  // Actualizar un servicio
  update(id: string, updateServiceDto: UpdateServiceDto): Service {
    const service = this.findOne(id);

    if (updateServiceDto.name && updateServiceDto.name.toLowerCase() !== service.name.toLowerCase()) {
      const existing = this.services.find(
        (s) => s.name.toLowerCase() === updateServiceDto.name!.toLowerCase() && s.isActive && s.id !== id,
      );
      if (existing) {
        throw new BadRequestException(`Ya existe otro servicio con el nombre "${updateServiceDto.name}"`);
      }
    }

    const updatedService = Object.assign(service, {
      ...updateServiceDto,
      updatedAt: new Date(),
    });

    return updatedService;
  }

  // Baja lógica (Soft delete)
  remove(id: string): { message: string; id: string } {
    const service = this.findOne(id);
    service.isActive = false;
    service.updatedAt = new Date();
    return { message: `Servicio "${service.name}" eliminado correctamente`, id };
  }
}