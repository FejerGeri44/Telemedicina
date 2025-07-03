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

  ngOnInit() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getDoctorMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
      },
      error: (err) => {
        console.error('❌ Doctor user lekérése sikertelen:', err);
      }
    });
  }

  constructor(private http: HttpClient) {}

  formatPhoneNumber(phone: string | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
}
