import { User } from './user.interface';
import { Patient } from './patient.interface';
import { Doctor } from './doctor.interface';
import { Admin } from './admin.interface';

export interface LoggedUser {
  user: User;
  related: Patient | Doctor | Admin;
}
