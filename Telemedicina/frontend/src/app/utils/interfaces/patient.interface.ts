import {User} from './user.interface';

export type genders = 'nő' | 'férfi';

export interface Patient {
  id: number;
  height?: number | null;
  weight?: number | null;
  homePhone?: string | null;
  taj: string;
  gender: genders;
  birthDate?: string | null;
  registDate: string;
  tags?: PatientTag[];
}

export interface PatientItem {
  user: User;
  patient: Patient;
  tags?: PatientTag[];
}

export interface PatientTag {
  id: number;
  name: string;
  value: string;
}
