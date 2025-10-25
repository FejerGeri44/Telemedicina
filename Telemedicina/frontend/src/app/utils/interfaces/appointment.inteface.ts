import {DoctorItem} from './doctor.interface';

export interface Appointment {
  id: number;
  doctor_id: string;
  patient_id: string;
  from: string;
  to: string;
  status: string;
}

export interface newAppointment {
  date: string;
  from: string;
  to: string;
}

export interface MyAppointment {
  id: number;
  doctor: DoctorItem;
  from: string;
  to: string;
  status: string;
}

export interface prevAppointment {
  id: number;
  doctor_id: number;
  patient_id: number | null;
  from: string;
  to: string;
  status: string;
}
