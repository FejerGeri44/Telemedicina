import {Routes} from '@angular/router';
import {HomeComponent} from './home.component';
import { RegistLoginComponent } from "../regist-login/regist-login.component";

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'regist_login', component: RegistLoginComponent },
];
