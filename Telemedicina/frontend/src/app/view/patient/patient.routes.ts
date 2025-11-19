import { Routes } from '@angular/router';

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./patient-dashboard/patient-dashboard.component')
        .then(m => m.PatientDashboardComponent),
    children: [
      {
        path: 'patient-home',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/patient-home/patient-home.component')
            .then(m => m.PatientHomeComponent),
      },
      {
        path: 'doctor-search',
        loadComponent: () =>
          import('./pages/doctor-search/doctor-search.component')
            .then(m => m.DoctorSearchComponent),
      },
      {
        path: 'appointment-list',
        loadComponent: () =>
          import('./pages/appointment-list/appointment-list.component')
            .then(m => m.AppointmentListComponent),
      },
      {
        path: 'health-diary',
        loadComponent: () =>
          import('./pages/health-diary/health-diary.component')
            .then(m => m.HealthDiaryComponent),
      },
      {
        path: 'patient-messages',
        loadComponent: () =>
          import('./pages/patient-messages/patient-messages.component')
            .then(m => m.PatientMessagesComponent),
      },
      {
        path: 'patient-messages/:doctorId',
        loadComponent: () =>
          import('./pages/patient-messages/patient-messages.component')
            .then(m => m.PatientMessagesComponent),
      }
    ],
  },
];
