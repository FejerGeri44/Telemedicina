import { Routes } from '@angular/router';

export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./doctor-dashboard/doctor-dashboard.component')
        .then(m => m.DoctorDashboardComponent),
    children: [
      {
        path: 'doctor-home',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/doctor-home/doctor-home.component')
            .then(m => m.DoctorHomeComponent),
      },
      {
        path: 'my-patients',
        loadComponent: () =>
          import('./pages/my-patients/my-patients.component')
            .then(m => m.MyPatientsComponent),
      },
      {
        path: 'new-diagnosis',
        loadComponent: () =>
          import('./pages/new-diagnosis/new-diagnosis.component')
            .then(m => m.NewDiagnosisComponent),
      },
      {
        path: 'appointments',
        loadComponent: () =>
          import('./pages/appointments/appointments.component')
            .then(m => m.AppointmentsComponent),
      },
      {
        path: 'doctor-messages',
        loadComponent: () =>
          import('./pages/doctor-messages/doctor-messages.component')
            .then(m => m.DoctorMessagesComponent),
      },
      {
        path: 'doctor-messages/:patientId',
        loadComponent: () =>
          import('./pages/doctor-messages/doctor-messages.component')
            .then(m => m.DoctorMessagesComponent),
      },
      {
        path: 'document-upload',
        loadComponent: () =>
          import('./pages/document-upload/document-upload.component')
            .then(m => m.UploadDocumentComponent),
      },
    ],
  },
];
