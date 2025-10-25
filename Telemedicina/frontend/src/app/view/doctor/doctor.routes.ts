import { Routes } from '@angular/router';
import {authChildGuard, authMatchGuard} from '../../utils/guards/auth.guard';

export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    canMatch: [authMatchGuard],
    canActivateChild: [authChildGuard],
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
    ],
  },
];
