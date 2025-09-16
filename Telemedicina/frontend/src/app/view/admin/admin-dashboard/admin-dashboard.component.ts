import {Component} from '@angular/core';
import { AdminNavbarComponent } from '../components/admin-navbar/admin-navbar.component';
import {IonicModule} from '@ionic/angular';
import {RouterLink, RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    AdminNavbarComponent,
    IonicModule,
    RouterLink,
    RouterOutlet
  ],
  templateUrl: './admin-dashboard.component.html',
  standalone: true,
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {}
