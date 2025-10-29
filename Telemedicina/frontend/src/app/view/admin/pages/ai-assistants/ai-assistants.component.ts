import {Component} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {AiRulesCardComponent} from '../../components/ai-rules-card/ai-rules-card.component';
import {AiDemoCardComponent} from '../../components/ai-demo-card/ai-demo-card.component';

@Component({
  selector: 'app-ai-assistants',
  imports: [
    IonicModule,
    FormsModule,
    NgIf,
    AiRulesCardComponent,
    AiDemoCardComponent
  ],
  templateUrl: './ai-assistants.component.html',
  standalone: true,
  styleUrl: './ai-assistants.component.scss'
})
export class AiAssistantsComponent {
  mainTab: 'patient' | 'doctor' = 'patient';
  patientSubTab: 'rules' | 'demo' = 'rules';
  doctorSubTab: 'rules' | 'demo' = 'rules';
}
