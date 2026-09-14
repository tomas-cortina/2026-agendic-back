import { ConflictError, NotFoundError } from '../../domain/errors';
import { Role, User } from '../../domain/users/user';
import { UsersRepository } from '../../domain/users/users.repository';

export class InMemoryUsersRepository implements UsersRepository {
  private readonly users: User[] = [];
  private nextId = 1;

  async create(data: Pick<User, 'name' | 'email' | 'passwordHash'>) {
    this.assertEmailFree(data.email);
    const user: User = {
      id: this.nextId++,
      ...data,
      role: Role.USER,
      createdAt: new Date(),
    };
    this.users.push(user);
    return { ...user };
  }

  async findById(id: number) {
    const user = this.users.find((u) => u.id === id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string) {
    const user = this.users.find((u) => u.email === email);
    return user ? { ...user } : null;
  }

  async update(id: number, data: Partial<Pick<User, 'name' | 'email'>>) {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new NotFoundError('User not found');
    if (data.email !== undefined && data.email !== user.email)
      this.assertEmailFree(data.email);
    user.name = data.name ?? user.name;
    user.email = data.email ?? user.email;
    return { ...user };
  }

  private assertEmailFree(email: string) {
    if (this.users.some((u) => u.email === email))
      throw new ConflictError('Email already registered');
  }
}
