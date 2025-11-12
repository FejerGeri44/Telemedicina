import {DoctorItem} from './doctor.interface';
import {PatientItem} from './patient.interface';

export interface Appointment {
  id: number;
  doctor_id: number;
  patient_id: number | null;
  starts_at: string;
  ends_at: string;
  status: string;
}

export interface newAppointment {
  date: string;
  from: string;
  to: string;
}

export interface MyAppointment extends Appointment{
  doctor?: DoctorItem;
  patient?: PatientItem;
}
