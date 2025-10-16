import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {
  DoctorEditProfileModalComponent
} from '../../components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';
import {RouterLink} from '@angular/router';
import {DoctorProfileCardComponent} from '../../components/doctor-profile-card/doctor-profile-card.component';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {DoctorItem, prevAppointment, SystemMessage} from '../../../../utils/interfaces/commonInterfaces';

@Component({
  selector: 'app-doctor-home',
  imports: [
    IonicModule,
    RouterLink,
    DoctorProfileCardComponent
  ],
  templateUrl: './doctor-home.component.html',
  standalone: true,
  styleUrl: './doctor-home.component.css'
})
export class DoctorHomeComponent implements OnInit{
  user!: DoctorItem;
  appointments: prevAppointment[] = [];
  todaysAppointments: number = 0;
  systemMessages: SystemMessage[] = [];

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.loadSystemMessagesOnceAfterLogin();
    this.loadMyData();
    this.loadAppointments();
  }

  loadSystemMessagesOnceAfterLogin(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const key = `System-Messages`;
    const alreadyShown = localStorage.getItem(key) === '1';
    if (alreadyShown) return;

    const payload = { audiences: ['all', 'doctor'] };
    this.http.post<SystemMessage[]>(
      'http://localhost:3000/api/system-messages-for-me',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res) => {
        this.systemMessages = res ?? [];
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

  loadMyData(){
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<DoctorItem>('http://localhost:3000/api/getDoctorMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.user = { user: res.user, doctor: res.doctor };
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
        user: this.user,
      }
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
      this.loadMyData();
    }
  }
}
