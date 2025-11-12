import {DoctorItem} from './doctor.interface';
import {PatientItem} from './patient.interface';

export interface Diagnosis {
  appointmentId: number | null;
  patientId: number | null;
  status: 'draft' | string;
  diagnosis_date: string;

  patient: {
    id: number | null;
    name: string;
    gender: string;
    phone: string;
    homePhone: string;
    email: string;
    address: string;
    taj: string;
  };

  chief_complaint: string;
  onset_date: string | null;
  history: string | null;

  bp_sys: number | null;
  bp_dia: number | null;
  heart_rate: number | null;
  temp_c: number | null;
  spo2: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  exam_summary: string | null;

  primary_text: string | null;
  code_system: 'ICD-10' | string;
  code: string | null;
  certainty_pct: number;
  severity: 'mild' | 'moderate' | 'severe' | string;
  differentials: string | null;

  assessment: string | null;
  plan_text: string | null;
  red_flags: boolean;
  informed: boolean;
}

export interface MyDiagnosis extends Diagnosis {
  doctor_data: DoctorItem;
  patient_data: PatientItem;
}
