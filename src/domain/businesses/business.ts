import { CreateBranchInput } from '../branches/branch';
import { CreateServiceInput } from '../services/service';

export interface Business {
  id: number;
  name: string;
  description: string;
  ownerId: number;
  /** The Clerk Organization this Business is mapped to 1:1, with the Dueño as its admin. */
  clerkOrgId: string;
}

/** A Negocio is created complete: it, its first Sucursal, its first Servicio and the Dueño as its Empleado. */
export interface CreateBusinessInput {
  business: { name: string; description: string };
  branch: CreateBranchInput;
  /** No `employeeIds`: the Dueño is the only Empleado there is to put in charge. */
  service: Omit<CreateServiceInput, 'employeeIds'>;
}

export interface UpdateBusinessInput {
  name?: string;
  description?: string;
}
