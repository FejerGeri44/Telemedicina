import {Component, OnInit} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {FormsModule} from '@angular/forms';
import {AiRulesCardComponent} from '../../components/ai-rules-card/ai-rules-card.component';
import {AiDemoCardComponent} from '../../components/ai-demo-card/ai-demo-card.component';
import {NgIf} from '@angular/common';
import {AiConfigService} from '../../../../shared/Ai-assistants/AiConfigService';

@Component({
  selector: 'app-ai-assistants',
  templateUrl: './ai-assistants.component.html',
  styleUrls: ['./ai-assistants.component.scss'],
  imports: [
    IonicModule,
    FormsModule,
    AiRulesCardComponent,
    AiDemoCardComponent,
    NgIf
  ],
  standalone: true
})
export class AiAssistantsComponent implements OnInit {
  mainTab: 'patient' | 'doctor' = 'patient';
  patientSubTab: 'rules' | 'demo' = 'rules';
  doctorSubTab: 'rules' | 'demo' = 'rules';

  constructor(private aiCfg: AiConfigService) {}

  async ngOnInit(): Promise<void> {
    await this.aiCfg.init();
  }
}
