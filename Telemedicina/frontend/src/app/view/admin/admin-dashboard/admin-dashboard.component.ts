import {Component, OnInit} from '@angular/core';
import { AdminNavbarComponent } from '../components/admin-navbar/admin-navbar.component';
import {IonicModule, ModalController} from '@ionic/angular';
import {HttpClient} from '@angular/common/http';
import {AdminProfileCardComponent} from '../components/admin-profile-card/admin-profile-card.component';
import {RouterLink} from '@angular/router';
import {
  DoctorEditProfileModalComponent
} from '../../doctor/components/doctor-edit-profile-modal/doctor-edit-profile-modal.component';
import {
  AdminEditProfileModalComponent
} from '../components/admin-edit-profile-modal/admin-edit-profile-modal.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    AdminNavbarComponent,
    IonicModule,
    AdminProfileCardComponent,
    RouterLink
  ],
  templateUrl: './admin-dashboard.component.html',
  standalone: true,
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit{
  user: any;
  patientsCount: number = 0;
  doctorsCount: number = 0;
  adminsCount: number = 0;

  ngOnInit() {
    this.getMyData();
    this.getAllPatients();
    this.getAllDoctors();
    this.getAllAdmins();
  }

  constructor(private http: HttpClient, private modalCtrl: ModalController) {}

  getMyData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get('http://localhost:3000/api/getAdminMe', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (user: any) => {
        this.user = user;
      },
      error: (err) => {
        console.error('❌ Admin user lekérése sikertelen:', err);
      }
    });
  }

  getAllPatients() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>('http://localhost:3000/api/admin/getAllPatients', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.patientsCount = res.length;
      },
      error: (err) => console.error('❌ Páciensek lekérése sikertelen:', err)
    });
  }

  getAllDoctors() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>('http://localhost:3000/api/admin/getAllDoctors', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.doctorsCount = res.length;
      },
      error: (err) => console.error('❌ Páciensek lekérése sikertelen:', err)
    });
  }

  getAllAdmins() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<any>('http://localhost:3000/api/admin/getAllAdmins', {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res: any) => {
        this.adminsCount = res.length;
      },
      error: (err) => console.error('❌ Páciensek lekérése sikertelen:', err)
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
      this.getMyData();
    }
  }
}
