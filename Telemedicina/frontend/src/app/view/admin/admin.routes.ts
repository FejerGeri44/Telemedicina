import { Routes } from '@angular/router';
import {AdminRoleGuard} from '../../guards/adminRole.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
    canActivate: [AdminRoleGuard],
    children: [
      {
        path: 'admin-home',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin-home/admin-home.component')
            .then(m => m.AdminHomeComponent),
        canActivate: [AdminRoleGuard],
      },
      {
        path: 'all-users',
        loadComponent: () =>
          import('./pages/all-users/all-users.component')
            .then(m => m.AllUsersComponent),
        canActivate: [AdminRoleGuard],
      },
      {
        path: 'doctor-approvals',
        loadComponent: () =>
          import('./pages/doctor-approvals/doctor-approvals.component')
            .then(m => m.DoctorApprovalsComponent),
        canActivate: [AdminRoleGuard],
      },
      {
        path: 'system-messages',
        loadComponent: () =>
          import('./pages/system-messages/system-messages.component')
            .then(m => m.SystemMessagesComponent),
        canActivate: [AdminRoleGuard],
      },
      {
        path: 'ai-assistants',
        loadComponent: () =>
          import('./pages/ai-assistants/ai-assistants.component')
            .then(m => m.AiAssistantsComponent),
        canActivate: [AdminRoleGuard],
      }
    ],
  },
];
