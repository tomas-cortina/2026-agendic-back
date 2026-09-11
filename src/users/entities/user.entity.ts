export class User {
  id!: string;
  name!: string;
  email!: string;
  password!: string; // En un entorno real esto irá encriptado
  role!: 'admin' | 'customer';
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}