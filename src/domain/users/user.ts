export interface User {
  id: number;
  clerkId: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface UpdateMeInput {
  name?: string;
}
