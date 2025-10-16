import {genders, userRoles} from '../userRoles';

export interface User {
  id: number;
  name: string;
  email: string;
  role: userRoles;
  phoneNumber: string;
  address?: string;
  birthDate?: string;
  pictureUrl: string;
}
export interface Patient {
  id: number;
  height?: number;
  weight?: number;
  homePhone?: string;
  taj?: string;
  gender?: genders;
  registeredAt?: string;
}
export interface PatientTag {
  name: string;
  value: string;
}
export interface Doctor {
  id: number;
  speciality: string;
  introduction?: string | null;
  avgRating?: number | null;
  registDate: string | null;
}
export interface DoctorItem {
  user: User;
  doctor: Doctor;
}
export interface Admin {
  id: number;
  registDate: string;
}
export interface AdminItem {
  user: User;
  admin: Admin;
}
export interface PatientItem {
  user: User;
  patient: Patient;
  tags?: PatientTag[];
}
export interface Appointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  from: string;
  to: string;
  status: string;
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
export interface newAppointment {
  date: string;
  from: string;
  to: string;
}
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
