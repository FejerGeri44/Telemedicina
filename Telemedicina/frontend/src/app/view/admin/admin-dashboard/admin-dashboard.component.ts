import { Component } from '@angular/core';
import { AdminNavbarComponent } from '../components/admin-navbar/admin-navbar.component';
import {IonicModule} from '@ionic/angular';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    AdminNavbarComponent,
    IonicModule
  ],
  templateUrl: './admin-dashboard.component.html',
  standalone: true,
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {

}
