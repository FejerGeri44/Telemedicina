import { Routes } from '@angular/router';
import {PatientRoleGuard} from '../../shared/guards/patientRole.guard';

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./patient-dashboard/patient-dashboard.component')
        .then(m => m.PatientDashboardComponent),
      canActivate: [PatientRoleGuard],
    children: [
      {
        path: 'patient-home',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/patient-home/patient-home.component')
            .then(m => m.PatientHomeComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'doctor-search',
        loadComponent: () =>
          import('./pages/doctor-search/doctor-search.component')
            .then(m => m.DoctorSearchComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'appointment-list',
        loadComponent: () =>
          import('./pages/appointment-list/appointment-list.component')
            .then(m => m.AppointmentListComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'health-diary',
        loadComponent: () =>
          import('./pages/health-diary/health-diary.component')
            .then(m => m.HealthDiaryComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'patient-messages',
        loadComponent: () =>
          import('./pages/patient-messages/patient-messages.component')
            .then(m => m.PatientMessagesComponent),
        canActivate: [PatientRoleGuard]
      },
    ],
  },
];
