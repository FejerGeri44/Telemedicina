import {Component, OnInit} from '@angular/core';
import {DoctorNavbarComponent} from '../components/doctor-navbar/doctor-navbar.component';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {DoctorProfileCardComponent} from '../components/doctor-profile-card/doctor-profile-card.component';
import {DoctorEditProfileModalComponent} from '../components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';

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
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    DoctorProfileCardComponent
  ],
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  styleUrl: './doctor-dashboard.component.css'
})

export class DoctorDashboardComponent implements OnInit{
  user: any;
  appointments: prevAppointment[] = [];
  todaysAppointments: number = 0;

  constructor(private http: HttpClient, private modalCtrl: ModalController) {}

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

  async openEditModal() {
    const modal = await this.modalCtrl.create({
      component: DoctorEditProfileModalComponent as any,
      cssClass: 'Profile-edit-modal',
      componentProps: {
        user: this.user
      }
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
      this.loadMyData();
    }
  }
}
