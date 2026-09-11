export class Professional {
  id!: string;
  name!: string;
  email!: string;
  specialty!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Professional>) {
    Object.assign(this, partial);
  }
}