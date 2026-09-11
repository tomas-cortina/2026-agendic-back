import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class UsersService {
  private users: User[] = [];

  create(createDto: CreateUserDto): User {
    const existing = this.users.find(u => u.email === createDto.email);
    if (existing) {
      throw new BadRequestException('El email ya está registrado');
    }

    const newUser = new User({
      id: randomUUID(),
      ...createDto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.users.push(newUser);
    return newUser;
  }

  findAll(): User[] {
    return this.users.filter(u => u.isActive);
  }

  findOne(id: string): User {
    const user = this.users.find(u => u.id === id);
    if (!user || !user.isActive) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  update(id: string, updateDto: UpdateUserDto): User {
    const user = this.findOne(id);

    if (updateDto.email && updateDto.email !== user.email) {
      const existing = this.users.find(u => u.email === updateDto.email && u.id !== id);
      if (existing) {
        throw new BadRequestException('El email ya está en uso por otro usuario');
      }
    }

    Object.assign(user, {
      ...updateDto,
      updatedAt: new Date(),
    });

    return user;
  }

  remove(id: string): { message: string; id: string } {
    const user = this.findOne(id);
    user.isActive = false;
    user.updatedAt = new Date();
    return { message: `Usuario ${user.name} dado de baja correctamente`, id };
  }
}