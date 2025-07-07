import {Component} from '@angular/core';
import {DoctorNavbarComponent} from '../components/doctor-navbar/doctor-navbar.component';
import {IonicModule} from '@ionic/angular';
import {NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';

interface prevAppointment {
  id: number;
  doctor_id: number;
  patient_id: number | null;
  from: string;
  to: string;
  status: string;
}

@Component({
  selector: 'app-doctor-dashboard',
  imports: [
    DoctorNavbarComponent,
    IonicModule,
    NgIf,
    FormsModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  styleUrl: './doctor-dashboard.component.css'
})

export class DoctorDashboardComponent {
  user: any;
  appointments: prevAppointment[] = [];
  todaysAppointments: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadMyData();
    this.loadAppointments();
  }

  loadMyData(){
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getDoctorMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
        console.log(this.user)
      },
      error: (err) => {
        console.error('❌ Doctor user lekérése sikertelen:', err);
      }
    });
  }

  formatPhoneNumber(phone: string | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  loadAppointments() {
    const token = localStorage.getItem('token');
    this.http.get<any[]>('http://localhost:3000/api/myAppointments', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        const today = new Date().toISOString().split('T')[0];

        this.todaysAppointments = this.appointments.filter(appt => {
          const apptDate = new Date(appt.from).toISOString().split('T')[0];
          return appt.patient_id !== null && apptDate === today;
        }).length;
      },
      error: (err) => console.error('❌ Hiba az időpontok lekérésekor:', err)
    });
  }
}
