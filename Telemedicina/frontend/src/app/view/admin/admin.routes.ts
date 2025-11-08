import { Routes } from '@angular/router';
import {PatientRoleGuard} from '../../shared/guards/patientRole.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    canActivate: [PatientRoleGuard],
    children: [
      {
        path: 'admin-home',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin-home/admin-home.component')
            .then(m => m.AdminHomeComponent)
      },
      {
        path: 'all-users',
        loadComponent: () =>
          import('./pages/all-users/all-users.component')
            .then(m => m.AllUsersComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'doctor-approvals',
        loadComponent: () =>
          import('./pages/doctor-approvals/doctor-approvals.component')
            .then(m => m.DoctorApprovalsComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'system-messages',
        loadComponent: () =>
          import('./pages/system-messages/system-messages.component')
            .then(m => m.SystemMessagesComponent),
        canActivate: [PatientRoleGuard]
      },
      {
        path: 'ai-assistants',
        loadComponent: () =>
          import('./pages/ai-assistants/ai-assistants.component')
            .then(m => m.AiAssistantsComponent),
        canActivate: [PatientRoleGuard]
      }
    ],
  },
];
