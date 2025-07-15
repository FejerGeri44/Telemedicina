import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgIf } from '@angular/common';
import { PatientNavbarComponent } from '../components/patient-navbar/patient-navbar.component';
import {IonicModule, ModalController} from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {EditProfileModalComponent} from '../components/edit-profile-modal/edit-profile-modal.component';
import { environment } from '../../../../../../enviroments/enviroment';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    NgIf,
    PatientNavbarComponent,
    IonicModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.css'
})

export class PatientDashboardComponent {
  user: any;
  pictureUrl: any;
  myAppointments: number = 0;

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

    const {data} = await modal.onDidDismiss();

    if (data) {
      this.user = data;
      localStorage.setItem('user', JSON.stringify(data));
    }
  }

  loadMyAppointments() {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ count: number }>('http://localhost:3000/api/loadMyAppointments', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: (res) => {
        this.myAppointments = res.count;
      },
      error: (err) => {
        console.error('❌ Nem sikerült lekérni az időpontok számát:', err);
      }
    });
  }
}
