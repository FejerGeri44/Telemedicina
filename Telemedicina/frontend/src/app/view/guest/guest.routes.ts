import { Routes } from '@angular/router';

export const GUEST_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/regist-login/forms/login-form/login-form.component')
            .then((m) => m.LoginFormComponent),
      },
      {
        path: 'regist-login',
        loadComponent: () =>
          import('./pages/regist-login/regist-login.component')
            .then((m) => m.RegistLoginComponent),
      },
      {
        path: 'doctor-regist',
        loadComponent: () =>
          import('./pages/regist-login/forms/doctor-regist/doctor-regist.component')
            .then((m) => m.DoctorRegistComponent),
      },
      {
        path: 'patient-regist',
        loadComponent: () =>
          import('./pages/regist-login/forms/patient-regist/patient-regist.component')
            .then((m) => m.PatientRegistComponent),
      },
    ],
  },
];
