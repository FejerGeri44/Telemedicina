import {User} from './user.interface';
import {PatientItem} from './patient.interface';

export interface Doctor {
  id: number;
  speciality: string;
  introduction?: string | null;
  avgRating?: number | null;
  registDate: string;
}

export interface DoctorRating {
  id: number;
  doctor_id: number;
  patient_id: number;
  value: number;
}

export interface DoctorItem {
  user: User;
  doctor: Doctor;
  ratings?: DoctorRating[];
}

export interface DoctorRating {
  id: number;
  doctor_id: number;
  patient_id: number;
  value: number;
  valid_until: string;
}

export interface DoctorRatingItem {
  id: number;
  doctor: DoctorItem;
  patient: PatientItem;
  value: number;
  valid_until: string;
}
