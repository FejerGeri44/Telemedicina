import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {
  PatientEditProfileModalComponent
} from '../../components/patient-edit-profile-modal/patient-edit-profile-modal.component';
import {PatientProfileCardComponent} from '../../components/patient-profile-card/patient-profile-card.component';
import {RouterLink} from '@angular/router';
import {NgForOf, NgIf} from '@angular/common';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {Appointment, PatientItem, PatientTag, SystemMessage} from '../../../../utils/interfaces/commonInterfaces';

@Component({
  selector: 'app-patient-home',
  imports: [
    PatientProfileCardComponent,
    IonicModule,
    RouterLink,
    NgIf,
    NgForOf
  ],
  templateUrl: './patient-home.component.html',
  standalone: true,
  styleUrl: './patient-home.component.css'
})
export class PatientHomeComponent implements OnInit {
  user!: PatientItem;
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
  systemMessages: SystemMessage[] = [];

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.loadSystemMessagesOnceAfterLogin();
    this.getMyData();
    this.loadMyTags();
    this.loadMyAppointments();
  }

  loadSystemMessagesOnceAfterLogin(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const key = `System-Messages`;
    const alreadyShown = localStorage.getItem(key) === '1';
    if (alreadyShown) return;

    const payload = { audiences: ['all', 'patient'] };
    this.http.post<SystemMessage[]>(
      'http://localhost:3000/api/system-messages-for-me',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res) => {
        this.systemMessages = res;
        void this.presentSystemMessagesModalsOnce();
        localStorage.setItem(key, '1');
      },
      error: (err) => console.error('❌ Rendszerüzenetek lekérése sikertelen:', err)
    });
  }

  async presentSystemMessagesModalsOnce(): Promise<void> {
    const token = localStorage.getItem('token');
    if (!token) return;

    const messages = this.systemMessages ?? [];
    if (!messages.length) return;

    const unseen = messages.filter(m => !localStorage.getItem(`System-Messages`));
    if (!unseen.length) return;

    for (const message of unseen) {
      const modal = await this.modalCtrl.create({
        component: SystemMessageModalComponent as any,
        componentProps: {
          messages: [message],
        },
        cssClass: 'system-message-modal',
        canDismiss: true,
        backdropDismiss: true,
      });

      await modal.present();
      await modal.onDidDismiss();

      localStorage.setItem(`System-Messages`, '1');
    }
  }

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<PatientItem>('http://localhost:3000/api/getPatientMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.user = { user: res.user, patient: res.patient };
      },
      error: (err) => {
        console.error('❌ Felhasználó lekérése sikertelen:', err);
      }
    });
  }

  loadMyTags() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<PatientTag[]>('http://localhost:3000/api/getPatientMeTags', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.tags = res;
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
