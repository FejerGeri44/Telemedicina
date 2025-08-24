import {Component, OnInit} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {PatientNavbarComponent} from '../components/patient-navbar/patient-navbar.component';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {PatientEditProfileModalComponent} from '../components/patient-edit-profile-modal/patient-edit-profile-modal.component';
import {RouterLink} from '@angular/router';
import {PatientProfileCardComponent} from '../components/patient-profile-card/patient-profile-card.component';

export interface Appointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  from: Date;
  to: Date;
  status: 'free' | 'accepted' | 'rejected';
}

interface PatientTag { name: string; value: string; }

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    NgIf,
    PatientNavbarComponent,
    IonicModule,
    FormsModule,
    RouterLink,
    NgForOf,
    PatientProfileCardComponent
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.css'
})

export class PatientDashboardComponent implements OnInit {
  user: any;
  pictureUrl: any;
  tags: PatientTag[] = [];
  appointments: Appointment[] = [];
  upcomingAppointments: Awaited<{
    date: string;
    pictureUrl: string | undefined;
    name: string | undefined;
    speciality: string | undefined;
    from: string;
    to: string
  }>[] = [];

  constructor(private http: HttpClient, private modalCtrl: ModalController) {
  }

  ngOnInit() {
    this.getMyData();
    this.loadMyTags();
    this.loadMyAppointments();
  }

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getPatientMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
        this.pictureUrl = this.user.pictureUrl;
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
  }

  loadMyTags() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getPatientMeTags', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res: any) => {
        this.tags = res?.tags ?? [];
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
  }

  async openEditModal() {
    const modal = await this.modalCtrl.create({
      component: PatientEditProfileModalComponent as any,
      cssClass: 'Profile-edit-modal',
      componentProps: {
        user: this.user
      }
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
      this.getMyData();
      this.loadMyTags();
    }
  }

  loadMyAppointments(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<Appointment[]>('http://localhost:3000/api/loadMyAppointments', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: async (appointments) => {
        const now = new Date();

        const upcoming = appointments
          .filter(app => new Date(app.from) >= now && app.status === 'accepted')
          .sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
          .slice(0, 2);

        this.upcomingAppointments = await Promise.all(
          upcoming.map(app => this.formatAppointmentWithPicture(app))
        );
        console.log(this.upcomingAppointments);
      },
      error: (err) => {
        console.error('❌ Nem sikerült lekérni az időpontokat:', err);
      }
    });
  }

  private async formatAppointmentWithPicture(app: Appointment): Promise<{
    date: string;
    pictureUrl: string | undefined;
    name: string | undefined;
    speciality: string | undefined;
    from: string;
    to: string;
  }> {
    const fromDate = new Date(app.from);
    const toDate = new Date(app.to);

    const dateStr = fromDate
      .toLocaleDateString('hu-HU')
      .replace(/\./g, '/')
      .replace(/\s/g, '');

    const fromTime = fromDate.toLocaleTimeString('hu-HU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const toTime = toDate.toLocaleTimeString('hu-HU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const token = localStorage.getItem('token');

    const response = await this.http.post<{ pictureUrl: string; name: string; speciality: string }>(
      'http://localhost:3000/api/getDoctorCardData',
      { doctorId: app.doctor_id },
      {
        headers: {
          Authorization: `Bearer ${token || ''}`
        }
      }
    ).toPromise();

    return {
      pictureUrl: response?.pictureUrl,
      name: response?.name,
      speciality: response?.speciality,
      date: dateStr,
      from: fromTime,
      to: toTime
    };
  }
}
