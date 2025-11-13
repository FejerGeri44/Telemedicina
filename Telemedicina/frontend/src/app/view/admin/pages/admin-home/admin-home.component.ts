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
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../services/user/user.service';
import {delay, filter, firstValueFrom, Observable, take} from 'rxjs';
import {environment} from '../../../../../../enviroment';
import {SystemMessage} from '../../../../utils/interfaces/system-message.interface';

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

  loadSystemMessagesOnceAfterLogin(): void {
    const key = `System-Messages`;
    if (sessionStorage.getItem(key) === '1') return;

    const payload = {
      audiences: ['all', 'admin']
    }

    this.http.post<SystemMessage[]>(
      `${environment.apiUrl}/messages/system-messages-for-me`,
      payload,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        this.systemMessages = res;
        void this.presentSystemMessagesModalsOnce();
        localStorage.setItem(key, '1');
      },
      error: (err) => console.error('❌ Rendszerüzenetek hiba:', err)
    });
  }

  async presentSystemMessagesModalsOnce(): Promise<void> {
    const messages = this.systemMessages ?? [];
    if (!messages.length) return;

    const unseen = messages.filter(message => !sessionStorage.getItem(`System-Messages-${message.id}`));
    if (!unseen.length) return;

    for (const message of unseen) {
      const modal = await this.modalCtrl.create({
        component: SystemMessageModalComponent as any,
        componentProps: {
          messages: [message]
        },

        cssClass: 'system-message-modal',
        canDismiss: true,
        backdropDismiss: true,
      });
      await modal.present();
      await modal.onDidDismiss();

      sessionStorage.setItem(`System-Messages-${message.id}`, '1');
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
