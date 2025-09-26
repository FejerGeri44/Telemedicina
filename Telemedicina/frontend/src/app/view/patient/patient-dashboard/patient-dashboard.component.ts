import {Component} from '@angular/core';
import {PatientNavbarComponent} from '../components/patient-navbar/patient-navbar.component';
import {IonicModule} from '@ionic/angular';
import {RouterOutlet} from '@angular/router';
import {ChatbotComponent} from '../../../shared/chatbot/chatbot.component';

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    PatientNavbarComponent,
    IonicModule,
    RouterOutlet,
    ChatbotComponent,
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.css'
})

export class PatientDashboardComponent {}
