import {Component} from '@angular/core';
import {DoctorNavbarComponent} from '../components/doctor-navbar/doctor-navbar.component';
import {IonicModule} from '@ionic/angular';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [
    DoctorNavbarComponent,
    IonicModule,
    RouterOutlet
  ],
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  styleUrl: './doctor-dashboard.component.css'
})

export class DoctorDashboardComponent {}
