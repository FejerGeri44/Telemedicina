import {Patient, PatientItem, PatientTag} from '../../utils/interfaces/patient.interface';
import {Doctor, DoctorItem} from '../../utils/interfaces/doctor.interface';
import {Admin, AdminItem} from '../../utils/interfaces/admin.interface';
import {User} from '../../utils/interfaces/user.interface';

export type LoggedUser =
  | { user: User; related: Patient }
  | { user: User; related: Doctor }
  | { user: User; related: Admin };

export type FrontendUser = PatientItem | DoctorItem | AdminItem;

export function mapLoggedToItem(src: LoggedUser): FrontendUser {
  const role = src.user.role;
  switch (role) {
    case 'patient': {
      const patient = src.related as Patient;
      const tags: PatientTag[] | undefined = Array.isArray(patient.tags) ? patient.tags : undefined;
      return { user: src.user, patient, tags };
    }
    case 'doctor': {
      const doctor = src.related as Doctor;
      return { user: src.user, doctor };
    }
    case 'admin': {
      const admin = src.related as Admin;
      return { user: src.user, admin };
    }
    default:
      throw new Error(`Ismeretlen szerep: ${(role as any)}`);
  }
}

export function isPatientItem(x: FrontendUser | null): x is PatientItem {
  return !!x && 'patient' in x;
}
export function isDoctorItem(x: FrontendUser | null): x is DoctorItem {
  return !!x && 'doctor' in x;
}
export function isAdminItem(x: FrontendUser | null): x is AdminItem {
  return !!x && 'admin' in x;
}
