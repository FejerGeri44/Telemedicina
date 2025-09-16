import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./view/guest/guest.routes').then(m => m.GUEST_ROUTES),
  },
  {
    path: 'patient',
    loadChildren: () => import('./view/patient/patient.routes').then(m => m.PATIENT_ROUTES),
  },
  {
    path: 'doctor',
    loadChildren: () => import('./view/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () => import('./view/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];

