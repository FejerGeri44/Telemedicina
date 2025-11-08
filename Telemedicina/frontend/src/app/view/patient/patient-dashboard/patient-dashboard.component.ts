import {Component} from '@angular/core';
import {PatientNavbarComponent} from '../components/patient-navbar/patient-navbar.component';
import {IonicModule} from '@ionic/angular';
import {RouterOutlet} from '@angular/router';
import {AiAssistantFabComponent} from '../../../shared/Ai-assistants/ai-assistant-fab/ai-assistant-fab.component';

@Component({
  selector: 'app-patient-dashboard',
  imports: [
    PatientNavbarComponent,
    IonicModule,
    RouterOutlet,
    AiAssistantFabComponent
  ],
  templateUrl: './patient-dashboard.component.html',
  standalone: true,
  styleUrl: './patient-dashboard.component.scss'
})

export class PatientDashboardComponent {}
