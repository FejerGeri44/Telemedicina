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

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      this.user = JSON.parse(storedUser);
    }
  }
}
