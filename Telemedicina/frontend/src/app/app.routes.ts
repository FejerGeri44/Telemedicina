import { Routes } from '@angular/router';
import { HomeComponent } from './view/Guest/pages/home/home.component';
import { LoginComponent } from './view/patient/pages/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
];
