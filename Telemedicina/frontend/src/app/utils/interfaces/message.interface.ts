export interface Message {
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
  latest: Message;
  count: number;
}
export interface PatientUnreadSummary {
  patientId: number;
  latest: Message;
  count: number;
}

