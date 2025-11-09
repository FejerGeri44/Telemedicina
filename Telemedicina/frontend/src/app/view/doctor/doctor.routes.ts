import { Routes } from '@angular/router';
import {DoctorRoleGuard} from '../../guards/doctorRole.guard';

export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./doctor-dashboard/doctor-dashboard.component')
        .then(m => m.DoctorDashboardComponent),
    canActivate: [DoctorRoleGuard],
    children: [
      {
        path: 'doctor-home',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/doctor-home/doctor-home.component')
            .then(m => m.DoctorHomeComponent),
        canActivate: [DoctorRoleGuard],
      },
      {
        path: 'my-patients',
        loadComponent: () =>
          import('./pages/my-patients/my-patients.component')
            .then(m => m.MyPatientsComponent),
        canActivate: [DoctorRoleGuard],
      },
      {
        path: 'new-diagnosis',
        loadComponent: () =>
          import('./pages/new-diagnosis/new-diagnosis.component')
            .then(m => m.NewDiagnosisComponent),
        canActivate: [DoctorRoleGuard],
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./pages/appointments/appointments.component')
            .then(m => m.AppointmentsComponent),
        canActivate: [DoctorRoleGuard],
      },
      {
        path: 'doctor-messages',
        loadComponent: () =>
          import('./pages/doctor-messages/doctor-messages.component')
            .then(m => m.DoctorMessagesComponent),
        canActivate: [DoctorRoleGuard],
      },
      {
        path: 'document-upload',
        loadComponent: () =>
          import('./pages/document-upload/document-upload.component')
            .then(m => m.UploadDocumentComponent),
        canActivate: [DoctorRoleGuard],
      },
    ],
  },
];
