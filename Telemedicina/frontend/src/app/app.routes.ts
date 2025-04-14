import { Routes } from '@angular/router';
import { HomeComponent } from './view/guest/pages/home/home.component';
import {RegistLoginComponent} from './view/guest/pages/regist-login/regist-login.component';

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
  }
];
