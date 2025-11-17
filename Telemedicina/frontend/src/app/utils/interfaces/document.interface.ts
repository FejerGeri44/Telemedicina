import {PatientItem} from './patient.interface';
import {DoctorItem} from './doctor.interface';

export interface Document {
  id: number;
  doctor_id: number;
  patient_id: number;
  encounter_id: string;
  storage_path: string;
}

export interface DocumentItem {
  diagnosis_date: string;
  document: Document;
  patient: PatientItem;
  doctor: DoctorItem;
}
