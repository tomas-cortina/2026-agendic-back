import { Service } from './service';

export const SERVICES_REPOSITORY = Symbol('ServicesRepository');

export interface ServicesRepository {
  /** Throws ConflictError when the name is taken by another active Service of the same Branch, in any casing. */
  create(
    data: Pick<
      Service,
      | 'branchId'
      | 'name'
      | 'description'
      | 'category'
      | 'durationMinutes'
      | 'price'
    > & { employeeIds: number[] },
  ): Promise<Service>;
  findById(id: number): Promise<Service | null>;
  listActiveByBranch(branchId: number): Promise<Service[]>;
  /** Leaves undefined fields unchanged. Throws ConflictError on a rename to a taken name. */
  update(
    id: number,
    data: Partial<
      Pick<
        Service,
        'name' | 'description' | 'category' | 'durationMinutes' | 'price'
      >
    >,
  ): Promise<Service>;
  /** Also cancels the Service's future BOOKED Bookings, atomically. */
  retire(
    id: number,
    retiredAt: Date,
  ): Promise<{ service: Service; cancelledBookings: number }>;
  /** Throws ConflictError when the Employee is already in charge of the Service. */
  addEmployee(serviceId: number, employeeId: number): Promise<Service>;
  /** Also cancels that pair's future BOOKED Bookings, atomically. */
  removeEmployee(
    serviceId: number,
    employeeId: number,
    now: Date,
  ): Promise<{ service: Service; cancelledBookings: number }>;
  /** Services not dados de baja that this Employee is in charge of, verified or not. */
  listActiveByEmployee(employeeId: number): Promise<Service[]>;
}
