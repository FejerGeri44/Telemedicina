import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {
  AdminEditProfileModalComponent
} from '../../components/admin-edit-profile-modal/admin-edit-profile-modal.component';
import {RouterLink} from '@angular/router';
import {AdminProfileCardComponent} from '../../components/admin-profile-card/admin-profile-card.component';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {SystemMessage} from '../../../../utils/interfaces/commonInterfaces';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../services/user/user.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {environment} from '../../../../../../../backend/config/enviroment';

@Component({
  selector: 'app-admin-home',
  imports: [
    IonicModule,
    RouterLink,
    AdminProfileCardComponent,
    NgForOf,
    NgIf,
    AsyncPipe
  ],
  templateUrl: './admin-home.component.html',
  standalone: true,
  styleUrl: './admin-home.component.scss'
})
export class AdminHomeComponent implements OnInit{
  user!: Observable<AdminItem | null>;
  patientsCount: number = 0;
  doctorsCount: number = 0;
  adminsCount: number = 0;
  pendingDoctors: number = 0;
  loading: boolean = false;
  systemMessagesForMe: SystemMessage[] = [];
  systemMessages: SystemMessage[] = [];

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    protected userService: UserService
  ) {
    this.user = this.userService.admin$();

    (async () => {
      const userValue = await firstValueFrom(
        this.userService.doctor$().pipe(
          filter((u): u is DoctorItem => !!u),
          take(1),
          delay(50)
        )
      );
    })();
  }

  ngOnInit() {
    this.loadSystemMessagesOnceAfterLogin();
    this.countPatients();
    this.countDoctors();
    this.countAdmins();
    this.loadPendingDoctors();
    this.loadMessages();
  }

  loadSystemMessagesOnceAfterLogin() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const key = `System-Messages`;
    const alreadyShown = localStorage.getItem(key) === '1';
    if (alreadyShown) return;

    const payload = { audiences: ['all', 'admin'] };
    this.http.post<SystemMessage[]>(
      'http://localhost:3000/api/system-messages-for-me',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: (res) => {
        this.systemMessagesForMe = res;
        void this.presentSystemMessagesModalsOnce();
        localStorage.setItem(key, '1');
      },
      error: (err) => console.error('❌ Rendszerüzenetek lekérése sikertelen:', err)
    });
  }

  async presentSystemMessagesModalsOnce() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const messages = this.systemMessagesForMe;
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

  countPatients(): void {
    this.http.get<PatientItem[]>(`${environment.apiUrl}/admin/getAllPatients`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.patientsCount = res.length;
      },
      error: (err) => {
        console.error('Páciensek lekérési hiba:', err);
      }
    });
  }

  countDoctors(): void {
    this.http.get<DoctorItem[]>(`${environment.apiUrl}/admin/getAllDoctors`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.doctorsCount = res.length;
      },
      error: (err) => {
        console.error('Orvosok lekérési hiba:', err);
      }
    });
  }

  countAdmins(): void {
    this.http.get<AdminItem[]>(`${environment.apiUrl}/admin/getAllAdmins`, {
      withCredentials: true
    }).subscribe({
      next: (res) => {
        this.adminsCount = res.length;
      },
      error: (err) => {
        console.error('Adminok lekérési hiba:', err);
      }
    });
  }

  loadPendingDoctors() {
    const payload = {
      status: "Pending"
    }

    this.http.post<DoctorItem[]>(`${environment.apiUrl}/admin/loadPendingOrDeniedDoctors`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.pendingDoctors = res.length;
      },
      error: (err) => {
        console.error('Pending orvosok lekérési hiba:', err);
      }
    });
  }

  loadMessages(): void {
    this.http.get<SystemMessage[]>(`${environment.apiUrl}/admin/getAllSystemMessage`,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.systemMessages = res;
      },
      error: (err) => {
        console.error('Rendszerüzenetek lekérése sikertelen:', err);
      }
    });
  }

  async openEditModal() {
    const user = await firstValueFrom(this.user.pipe(take(1)));

    const modal = await this.modalCtrl.create({
      component: AdminEditProfileModalComponent as any,
      cssClass: 'Admin-profile-edit-modal',
      componentProps: {
        user
      }
    });

    await modal.present();

    const {role} = await modal.onDidDismiss();

    if (role === 'updated') {
    }
  }
}
