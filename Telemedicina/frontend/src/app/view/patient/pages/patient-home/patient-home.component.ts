import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';

import { PatientProfileCardComponent } from '../../components/patient-profile-card/patient-profile-card.component';
import { PatientEditProfileModalComponent } from '../../components/patient-edit-profile-modal/patient-edit-profile-modal.component';
import { SystemMessageModalComponent } from '../../../../shared/system-message-modal/system-message-modal.component';

import { SystemMessage } from '../../../../utils/interfaces/commonInterfaces';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../shared/user.service';
import {Appointment, MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {AuthService} from '../../../../shared/auth.service';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatAppointmentTime} from '../../../../utils/formatProfileData';

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [PatientProfileCardComponent, IonicModule, RouterLink, NgIf, NgForOf],
  templateUrl: './patient-home.component.html',
  styleUrl: './patient-home.component.css'
})
export class PatientHomeComponent implements OnInit {
  user!: PatientItem;
  myAppointments: MyAppointment[] = [];
  isLoading = true;
  systemMessages: SystemMessage[] = [];

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private authService: AuthService,
    private userService: UserService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.getUserData();
    this.loadSystemMessagesOnceAfterLogin();
    void this.fetchAppointments();
  }

  private getUserData() {
    const cached = this.userService.getUserAsPatient();
    if (cached) {
      this.user = cached;
      return;
    }
  }

  loadSystemMessagesOnceAfterLogin(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const key = `System-Messages`;
    if (localStorage.getItem(key) === '1') return;

    this.http.post<SystemMessage[]>(
      'http://localhost:3000/api/system-messages-for-me',
      { audiences: ['all', 'patient'] },
      { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
    ).subscribe({
      next: (res) => { this.systemMessages = res; void this.presentSystemMessagesModalsOnce(); localStorage.setItem(key, '1'); },
      error: (err) => console.error('❌ Rendszerüzenetek hiba:', err)
    });
  }

  async presentSystemMessagesModalsOnce(): Promise<void> {
    const messages = this.systemMessages ?? [];
    if (!messages.length) return;

    const unseen = messages.filter(() => !localStorage.getItem(`System-Messages`));
    if (!unseen.length) return;

    for (const message of unseen) {
      const modal = await this.modalCtrl.create({
        component: SystemMessageModalComponent as any,
        componentProps: { messages: [message] },
        cssClass: 'system-message-modal',
        canDismiss: true,
        backdropDismiss: true,
      });
      await modal.present();
      await modal.onDidDismiss();
      localStorage.setItem(`System-Messages`, '1');
    }
  }

  async openEditModal() {
    const modal = await this.modalCtrl.create({
      component: PatientEditProfileModalComponent as any,
      cssClass: 'Profile-edit-modal',
      componentProps: { user: this.user }
    });

    await modal.present();
    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
      this.getUserData();
    }
  }

  async fetchAppointments(): Promise<void> {
    this.isLoading = true;

    const token = await this.authService.getIdToken();
    if (!token) {
      this.toast.show('Nincs bejelentkezett felhasználó!', 'warning');
      this.isLoading = false;
      return;
    }

    const payload = this.user?.patient?.id;

    this.http.post<MyAppointment[]>(
      `${environment.apiUrl}/patient/loadMyAppointments`,
      { payload },
      {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      }
    ).subscribe({
      next: (res) => {
        console.log(res)
        this.myAppointments = res;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  private async formatAppointmentWithPicture(app: Appointment) {
    const fromDate = new Date(app.from);
    const toDate = new Date(app.to);

    const date = fromDate.toLocaleDateString('hu-HU').replace(/\./g, '/').replace(/\s/g, '');
    const from = fromDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    const to   = toDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });

    const token = localStorage.getItem('token');

    const response = await this.http.post<{ pictureUrl: string; name: string; speciality: string }>(
      'http://localhost:3000/api/getDoctorCardData',
      { doctorId: app.doctor_id },
      { withCredentials: true, headers: token ? { Authorization: `Bearer ${token}` } : {} }
    ).toPromise();

    return { pictureUrl: response?.pictureUrl, name: response?.name, speciality: response?.speciality, date, from, to };
  }

  protected readonly formatAppointmentTime = formatAppointmentTime;
}
