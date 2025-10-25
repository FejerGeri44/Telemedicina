import {User} from './user.interface';
import {Patient, PatientTag} from './patient.interface';

export interface MyPatientCard {
  user: User;
  patient: Patient;
  tags: PatientTag[];
}
export interface UnreadMessage {
  id: number;
  content: string;
  senderUserId: number;
  receiverUserId: number;
  sendDate: string;
  isReadDoctor: boolean;
  isReadPatient: boolean;
  isDeletedDoctor: boolean;
  isDeletedPatient: boolean;
}

export interface DoctorUnreadSummary {
  doctorId: number;
  latest: UnreadMessage;
  count: number;
}
export interface PatientUnreadSummary {
  patientId: number;
  latest: UnreadMessage;
  count: number;
}
export interface SystemMessage {
  id: number;
  adminId: number | null;
  title: string;
  message: string;
  audience: 'all' | 'patient' | 'doctor' | 'admin';
  type: 'info' | 'warning' | 'error';
  createdAt: string;
  validUntil: string;
}
export interface Draft {
  appointmentId: number | null;
  patientId: string | null;
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

  // 1) Tünetek
  symptoms: {
    chiefComplaint: string;
    onsetDate: string | null;
    history: string | null;
  };

  // 2) Vizsgálat
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

  // 3) Diagnózis
  diagnosis: {
    primaryText: string | null;
    codeSystem: 'ICD-10' | string;
    code: string | null;
    certaintyPct: number;
    severity: 'mild' | 'moderate' | 'severe' | string;
    differentials: string | null;
  };

  // 4) Terv / Összegzés
  plan: {
    assessment: string | null;
    planText: string | null;
    redFlags: boolean;
    informed: boolean;
  };
}
