import {Component} from '@angular/core';
import {DoctorNavbarComponent} from '../components/doctor-navbar/doctor-navbar.component';
import {IonicModule} from '@ionic/angular';
import {RouterOutlet} from '@angular/router';
import {AiAssistantFabComponent} from '../../../shared/ai-assistant-fab/ai-assistant-fab.component';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [
    DoctorNavbarComponent,
    IonicModule,
    RouterOutlet,
    AiAssistantFabComponent
  ],
  templateUrl: './doctor-dashboard.component.html',
  standalone: true,
  styleUrl: './doctor-dashboard.component.scss'
})

export class DoctorDashboardComponent {}
