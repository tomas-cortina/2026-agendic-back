import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { Professional } from './entities/professional.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class ProfessionalsService {
  private professionals: Professional[] = [];

  create(createDto: CreateProfessionalDto): Professional {
    const existing = this.professionals.find(p => p.email === createDto.email);
    if (existing) {
      throw new BadRequestException('Ya existe un profesional registrado con ese email');
    }

    const newProfessional = new Professional({
      id: randomUUID(),
      ...createDto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.professionals.push(newProfessional);
    return newProfessional;
  }

  findAll(): Professional[] {
    return this.professionals.filter(p => p.isActive);
  }

  findOne(id: string): Professional {
    const professional = this.professionals.find(p => p.id === id);
    if (!professional || !professional.isActive) {
      throw new NotFoundException(`Profesional con ID ${id} no encontrado`);
    }
    return professional;
  }

  update(id: string, updateDto: UpdateProfessionalDto): Professional {
    const professional = this.findOne(id);

    if (updateDto.email && updateDto.email !== professional.email) {
      const existing = this.professionals.find(p => p.email === updateDto.email && p.id !== id);
      if (existing) {
        throw new BadRequestException('El email ya está en uso por otro profesional');
      }
    }

    Object.assign(professional, {
      ...updateDto,
      updatedAt: new Date(),
    });

    return professional;
  }

  remove(id: string): { message: string; id: string } {
    const professional = this.findOne(id);
    professional.isActive = false;
    professional.updatedAt = new Date();
    return { message: `Profesional ${professional.name} dado de baja correctamente`, id };
  }
}