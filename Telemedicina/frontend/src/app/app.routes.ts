import { Routes } from '@angular/router';
import { HomeComponent } from './view/guest/pages/home/home.component';
import {RegistLoginComponent} from './view/guest/pages/regist-login/regist-login.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'regist-login', component: RegistLoginComponent }
];
