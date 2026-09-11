export class Service {
  id!: string;
  name!: string;
  description?: string;
  durationMinutes!: number; // Duración en minutos (ej: 30, 60)
  price!: number;           // Precio del servicio
  isActive!: boolean;       // Permite deshabilitar sin borrar
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Service>) {
    Object.assign(this, partial);
  }
}