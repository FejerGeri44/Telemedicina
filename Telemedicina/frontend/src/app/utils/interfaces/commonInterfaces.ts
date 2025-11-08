import {AdminItem} from './admin.interface';

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
  admin?: AdminItem;
  title: string;
  message: string;
  audience: 'all' | 'patient' | 'doctor' | 'admin';
  type: 'info' | 'warning' | 'error';
  createdAt: string;
  validUntil: string;
}
