import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { LoginFormComponent } from './forms/login-form/login-form.component';
import { PatientRegistComponent } from './forms/patient-regist/patient-regist.component';
import { DoctorRegistComponent } from './forms/doctor-regist/doctor-regist.component';

@Component({
  selector: 'app-regist-login',
  standalone: true,
  templateUrl: './regist-login.component.html',
  styleUrls: ['./regist-login.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    LoginFormComponent,
    PatientRegistComponent,
    DoctorRegistComponent
  ]
})
export class RegistLoginComponent {
  activeTab: 'login' | 'patient' | 'doctor' = 'login';

  constructor() {}
}
