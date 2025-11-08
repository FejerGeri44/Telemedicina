import {DoctorItem} from './doctor.interface';

export interface Diagnosis {
  appointmentId: number | null;
  patientId: number | null;
  status: 'draft' | string;

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

  symptoms: {
    chiefComplaint: string;
    onsetDate: string | null;
    history: string | null;
  };

  exam: {
    bpSys: number | null;
    bpDia: number | null;
    heartRate: number | null;
    tempC: number | null;
    spo2: number | null;
    weightKg: number | null;
    heightCm: number | null;
    bmi: number | null;
    examSummary: string | null;
  };

  diagnosis: {
    primaryText: string | null;
    codeSystem: 'ICD-10' | string;
    code: string | null;
    certaintyPct: number;
    severity: 'mild' | 'moderate' | 'severe' | string;
    differentials: string | null;
  };

  plan: {
    assessment: string | null;
    planText: string | null;
    redFlags: boolean;
    informed: boolean;
  };
}

export interface MyDiagnosis extends Diagnosis {
  doctor: DoctorItem
}
