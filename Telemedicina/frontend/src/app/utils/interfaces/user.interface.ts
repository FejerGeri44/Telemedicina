export type userRoles = 'doctor' | 'patient' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: userRoles;
  phoneNumber: string;
  address?: string | null;
  pictureUrl: string;
}
