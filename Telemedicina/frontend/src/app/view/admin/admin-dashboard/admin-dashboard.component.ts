import { Component } from '@angular/core';
import { AdminNavbarComponent } from '../components/admin-navbar/admin-navbar.component';
import {IonicModule} from '@ionic/angular';
import {NgIf} from "@angular/common";
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-admin-dashboard',
    imports: [
        AdminNavbarComponent,
        IonicModule,
        NgIf
    ],
  templateUrl: './admin-dashboard.component.html',
  standalone: true,
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {
  user: any;

  ngOnInit() {
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

  constructor(private http: HttpClient) {}

  formatPhoneNumber(phone: string | undefined): string {
    if (!phone || phone.length !== 11 || !phone.startsWith('06')) return phone ?? '';
    return `${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
}
