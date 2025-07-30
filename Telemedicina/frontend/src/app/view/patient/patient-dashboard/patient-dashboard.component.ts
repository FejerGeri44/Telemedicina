import {Component} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {PatientNavbarComponent} from '../components/patient-navbar/patient-navbar.component';
import {IonicModule, ModalController} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {EditProfileModalComponent} from '../components/edit-profile-modal/edit-profile-modal.component';
import {RouterLink} from '@angular/router';

export interface Appointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  from: Date;
  to: Date;
  status: 'free' | 'accepted' | 'rejected';
}

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    NgIf,
    PatientNavbarComponent,
    IonicModule,
    FormsModule,
    RouterLink,
    NgForOf
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.css'
})

export class PatientDashboardComponent {
  user: any;
  pictureUrl: any;
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
        console.log(this.pictureUrl)
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
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

  formatPhoneNumber(phone: string | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  async openEditModal() {
    const modal = await this.modalCtrl.create({
      component: EditProfileModalComponent as any,
      componentProps: {
        user: this.user
      }
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
      this.getMyData();
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
