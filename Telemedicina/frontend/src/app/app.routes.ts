import { Routes } from '@angular/router';
import {AdminRoleGuard} from './guards/adminRole.guard';
import {DoctorRoleGuard} from './guards/doctorRole.guard';
import {PatientRoleGuard} from './guards/patientRole.guard';
export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./view/guest/guest.routes').then(m => m.GUEST_ROUTES),
  },
  {
    path: 'patient',
    loadChildren: () => import('./view/patient/patient.routes').then(m => m.PATIENT_ROUTES),
    canActivate: [PatientRoleGuard],
  },
  {
    path: 'doctor',
    loadChildren: () => import('./view/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES),
    canActivate: [DoctorRoleGuard],
  },
  {
    path: 'admin',
    loadChildren: () => import('./view/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [AdminRoleGuard],
  },
  {
    path: 'error',
    loadComponent: () => import('./view/guest/pages/error-page/error-page.component').then(m => m.ErrorPageComponent),
  },
  { path: '**', redirectTo: 'error' },
];

