import {Component} from '@angular/core';
import {PatientNavbarComponent} from '../components/patient-navbar/patient-navbar.component';
import {IonicModule} from '@ionic/angular';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    PatientNavbarComponent,
    IonicModule,
    RouterOutlet
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.css'
})

export class PatientDashboardComponent {}
