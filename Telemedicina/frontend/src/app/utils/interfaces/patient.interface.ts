import {User} from './user.interface';

export type genders = 'Nő' | 'Férfi';

export interface Patient {
  id: number;
  userId: number;
  height?: number | string |null;
  weight?: number | string | null;
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
  tag_name: string;
  tag_value: string;
}
