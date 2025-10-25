import {User} from './user.interface';

export interface Doctor {
  id: number;
  speciality: string;
  introduction?: string | null;
  avgRating?: number | null;
  registDate: string;
}

export interface DoctorItem {
  user: User;
  doctor: Doctor;
}
