import {Component, OnInit} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage} from '@angular/common';

import { PatientProfileCardComponent } from '../../components/patient-profile-card/patient-profile-card.component';
import { PatientEditProfileModalComponent } from '../../components/patient-edit-profile-modal/patient-edit-profile-modal.component';
import { SystemMessageModalComponent } from '../../../../shared/system-message-modal/system-message-modal.component';

import { SystemMessage } from '../../../../utils/interfaces/commonInterfaces';
import {UserService} from '../../../../services/user/user.service';
import {MyAppointment} from '../../../../utils/interfaces/appointment.inteface';
import {environment} from '../../../../../../../backend/config/enviroment';
import {ToastService} from '../../../../shared/toast/toast.service';
import {formatAppointmentTime} from '../../../../utils/formatProfileData';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {firstValueFrom, Observable, take} from 'rxjs';

@Component({
  selector: 'app-patient-home',
  standalone: true,
  imports: [PatientProfileCardComponent, IonicModule, RouterLink, NgIf, NgForOf, NgOptimizedImage, AsyncPipe],
  templateUrl: './patient-home.component.html',
  styleUrl: './patient-home.component.scss'
})
export class PatientHomeComponent implements OnInit {
  user: Observable<PatientItem | null>;
  myAppointments: MyAppointment[] = [];
  isLoading = true;
  systemMessages: SystemMessage[] = [];

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    protected userService: UserService,
    private toast: ToastService
  ) {
    this.user = this.userService.patient$();
  }

  ngOnInit() {
    this.loadSystemMessagesOnceAfterLogin();
    void this.fetchAppointments();
  }

  private async getPatientId(): Promise<number | null> {
    const user = await firstValueFrom(this.user);
    return user?.patient.id ?? null;
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
    const user = await firstValueFrom(this.user.pipe(take(1)));

    const modal = await this.modalCtrl.create({
      component: PatientEditProfileModalComponent as any,
      cssClass: 'Profile-edit-modal',
      componentProps: { user }
    });

    await modal.present();
    const { role } = await modal.onDidDismiss();

    if (role === 'updated') {
    }
  }

  async fetchAppointments(): Promise<void> {
    this.isLoading = true;

    const patientId = await this.getPatientId();
    if (!patientId) {
      this.toast.show('Hiányzik a páciens azonosító. Jelentkezz be újra.', 'danger');
      return;
    }

    this.http.post<MyAppointment[]>(
      `${environment.apiUrl}/patient/loadMyAppointments`,
      { patientId },
      {
        withCredentials: true,
      }
    ).subscribe({
      next: (res) => {
        this.limitAppointmentNumbers(res);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Nem sikerült betölteni az időpontokat:', error);
        this.isLoading = false;
      }
    });
  }

  limitAppointmentNumbers(appointments: MyAppointment[]) {
    const now = Date.now();

    this.myAppointments = (appointments ?? [])
      .map(a => ({ ...a, _ts: new Date(a.from).getTime() }))
      .filter(a => Number.isFinite(a._ts) && a._ts >= now)
      .sort((a, b) => a._ts - b._ts)
      .slice(0, 2)
      .map(({ _ts, ...a }) => a);
  }

  protected readonly formatAppointmentTime = formatAppointmentTime;
}
