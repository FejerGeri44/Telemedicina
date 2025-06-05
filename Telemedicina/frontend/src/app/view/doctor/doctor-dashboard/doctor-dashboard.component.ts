import {Component, ElementRef, ViewChild} from '@angular/core';
import { DoctorNavbarComponent } from '../components/doctor-navbar/doctor-navbar.component';
import {IonicModule} from '@ionic/angular';
import {NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [
    DoctorNavbarComponent,
    IonicModule,
    NgIf,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  styleUrl: './doctor-dashboard.component.css'
})
export class DoctorDashboardComponent {
  user: any;

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }

  getAge(birthDateString: string): number {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
