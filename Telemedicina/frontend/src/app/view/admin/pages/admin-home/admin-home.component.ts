import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {IonicModule, ModalController} from '@ionic/angular';
import {
  AdminEditProfileModalComponent
} from '../../components/admin-edit-profile-modal/admin-edit-profile-modal.component';
import {RouterLink} from '@angular/router';
import {AdminProfileCardComponent} from '../../components/admin-profile-card/admin-profile-card.component';
import {SystemMessageModalComponent} from '../../../../shared/system-message-modal/system-message-modal.component';
import {NgForOf, NgIf} from '@angular/common';
import {AdminItem} from '../../../../utils/interfaces/admin.interface';
import {DoctorItem} from '../../../../utils/interfaces/doctor.interface';
import {SystemMessage} from '../../../../utils/interfaces/commonInterfaces';
import {PatientItem} from '../../../../utils/interfaces/patient.interface';
import {UserService} from '../../../../shared/user.service';

@Component({
  selector: 'app-admin-home',
  imports: [
    IonicModule,
    RouterLink,
    AdminProfileCardComponent,
    NgForOf,
    NgIf
  ],
  templateUrl: './admin-home.component.html',
  standalone: true,
  styleUrl: './admin-home.component.scss'
})
export class AdminHomeComponent implements OnInit{
  user!: AdminItem;
  patientsCount: number = 0;
  doctorsCount: number = 0;
  adminsCount: number = 0;
  pendingDoctors: DoctorItem[] = [];
  loading: boolean = false;
  systemMessagesForMe: SystemMessage[] = [];
  systemMessages: SystemMessage[] = [];

  constructor(
    private http: HttpClient,
    private modalCtrl: ModalController,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadSystemMessagesOnceAfterLogin();
    this.getUserData();
    this.getAllPatients();
    this.getAllDoctors();
    this.getAllAdmins();
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

  private getUserData() {

  }

  getAllPatients() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<PatientItem[]>('http://localhost:3000/api/admin/getAllPatients', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.patientsCount = res.length;
      },
      error: (err) => console.error('❌ Páciensek lekérése sikertelen:', err)
    });
  }

  getAllDoctors() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<DoctorItem[]>('http://localhost:3000/api/admin/getAllDoctors', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.doctorsCount = res.length;
      },
      error: (err) => console.error('❌ Páciensek lekérése sikertelen:', err)
    });
  }

  getAllAdmins() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<AdminItem[]>('http://localhost:3000/api/admin/getAllAdmins', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.adminsCount = res.length;
      },
      error: (err) => console.error('❌ Páciensek lekérése sikertelen:', err)
    });
  }

  loadPendingDoctors() {
    this.loading = true;
    const token = localStorage.getItem('token') ?? '';
    this.http.get<DoctorItem[]>('http://localhost:3000/api/admin/pendingDoctors', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.pendingDoctors = res;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Pending orvosok lekérési hiba:', err);
      }
    });
  }

  loadMessages(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<SystemMessage[]>('http://localhost:3000/api/admin/getAllSystemMessage', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.systemMessages = res;
      },
      error: (err) => {
        console.error('Rendszerüzenetek lekérése sikertelen:', err);
      }
    });
  }

  async openEditModal() {
    const modal = await this.modalCtrl.create({
      component: AdminEditProfileModalComponent as any,
      cssClass: 'Admin-profile-edit-modal',
      componentProps: {
        user: this.user
      }
    });

    await modal.present();

    const {role} = await modal.onDidDismiss();

    if (role === 'updated') {
      this.getUserData();
    }
  }
}
