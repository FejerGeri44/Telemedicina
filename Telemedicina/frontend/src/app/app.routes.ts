import { Routes } from '@angular/router';
import { HomeComponent } from './view/guest/pages/home/home.component';
import { RegistLoginComponent } from './view/guest/pages/regist-login/regist-login.component';
import { DoctorDashboardComponent } from './view/doctor/doctor-dashboard/doctor-dashboard.component';
import { PatientDashboardComponent } from './view/patient/patient-dashboard/patient-dashboard.component';
import { AdminDashboardComponent } from './view/admin/admin-dashboard/admin-dashboard.component';
import { DoctorSearchComponent } from './view/patient/pages/doctor-search/doctor-search.component';
import { AppointmentsComponent } from './view/doctor/pages/appointments/appointments.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'regist-login', component: RegistLoginComponent },
  {
    path: '',
    loadComponent: () =>
      import('./view/guest/pages/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./view/guest/pages/regist-login/forms/login-form/login-form.component').then((m) => m.LoginFormComponent)
  },
  {
    path: 'doctor-regist',
    loadComponent: () =>
      import('./view/guest/pages/regist-login/forms/doctor-regist/doctor-regist.component').then((m) => m.DoctorRegistComponent)
  },
  {
    path: 'patient-regist',
    loadComponent: () =>
      import('./view/guest/pages/regist-login/forms/patient-regist/patient-regist.component').then((m) => m.PatientRegistComponent)
  },
  { path: 'dashboard/doctor', component: DoctorDashboardComponent },
  { path: 'dashboard/patient', component: PatientDashboardComponent },
  { path: 'dashboard/admin', component: AdminDashboardComponent },
  { path: 'doctor-search', component: DoctorSearchComponent },
  { path: 'appointments', component: AppointmentsComponent }
];
