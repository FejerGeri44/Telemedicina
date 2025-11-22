import {Component} from '@angular/core';
import { AdminNavbarComponent } from '../components/admin-navbar/admin-navbar.component';
import {RouterOutlet} from '@angular/router';
import {IONIC_COMPONENTS} from '../../../shared/ionic-imports';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    ...IONIC_COMPONENTS,
    AdminNavbarComponent,
    RouterOutlet
  ],
  templateUrl: './admin-dashboard.component.html',
  standalone: true,
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {}
